import {
  formGenerationReviewDecisions,
  formGenerationStatuses,
  type FormGenerationStatus,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';
import {
  formGenerationSignals,
  type FormGenerationReviewSignal,
  type GenerateFormWorkflowInput,
} from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import {
  CancellationScope,
  condition,
  defineSignal,
  log,
  proxyActivities,
  setHandler,
} from '@temporalio/workflow';

import { generationPolicy } from '../domain/generation-policy';
import type { FormGenerationActivities } from '../domain/ports/form-generation-activities.port';

/**
 * El pipeline completo, visto desde arriba.
 *
 *   RETRIEVING → (GENERATING → VALIDATING → REPAIRING)* → AWAITING_REVIEW
 *                                                       → APPROVED | REJECTED
 *                                                       └→ FAILED
 *
 * Este archivo no hace nada: decide en qué orden se hacen las cosas y qué pasa
 * cuando algo sale mal. Toda la sustancia está en las actividades, que corren
 * afuera del sandbox y pueden tocar la red y la base.
 *
 * Lo que sí aporta —y no se puede conseguir de otra forma— es durabilidad. El
 * bucle de reintentos, la espera de 30 días por una firma humana y el estado
 * de cada solicitud sobreviven a que el pod se reinicie, se reemplace o se
 * caiga a la mitad. Sin esto, la espera por revisión sería una fila en una
 * tabla y un cron mirándola.
 */

const activities = proxyActivities<FormGenerationActivities>({
  startToCloseTimeout: generationPolicy.storeTimeout,
  retry: generationPolicy.activityRetry,
});

/**
 * Las que salen a la red van con su propio timeout. Un mismo `proxyActivities`
 * para todo obligaría a usar el más largo en todas, y una escritura en
 * Postgres colgada se descubriría cinco minutos tarde.
 */
const retrieval = proxyActivities<
  Pick<FormGenerationActivities, 'retrieveRegulatoryContext'>
>({
  startToCloseTimeout: generationPolicy.retrievalTimeout,
  retry: generationPolicy.activityRetry,
});

const generation = proxyActivities<
  Pick<FormGenerationActivities, 'requestFormDraft'>
>({
  startToCloseTimeout: generationPolicy.generationTimeout,
  retry: generationPolicy.activityRetry,
});

export const reviewSignal = defineSignal<[FormGenerationReviewSignal]>(
  formGenerationSignals.review,
);

/**
 * Punto de entrada. Lo único que agrega sobre `runGeneration` es la garantía de
 * que la solicitud **nunca queda en un estado intermedio**.
 *
 * Sin esto, cualquier error que las actividades no puedan reintentar —LiteLLM
 * devolviendo 404 porque retiraron el modelo, por ejemplo— hace fallar el
 * workflow con la fila todavía en GENERATING. Temporal lo registra y se ve en
 * su UI, pero la base no se entera: no hay cambio de estado, no hay `NOTIFY`, y
 * el front se queda esperando para siempre un avance que no va a llegar. La
 * persona ve «Redactando…» hasta que cierre la pestaña.
 */
export async function generateForm(
  input: GenerateFormWorkflowInput,
): Promise<FormGenerationStatus> {
  try {
    return await runGeneration(input);
  } catch (error) {
    // `nonCancellable` porque esto también tiene que correr cuando lo que
    // interrumpió al workflow fue una cancelación: si la escritura se cancela
    // con el resto, se pierde justo el aviso que hacía falta dar.
    await CancellationScope.nonCancellable(() =>
      activities.failFormGeneration({
        formGenerationId: input.formGenerationId,
        reason: describeFailure(error),
      }),
    );

    // Se relanza a propósito: la fila ya dice FAILED para el front, y el
    // workflow tiene que quedar como fallido en Temporal para que el error
    // completo siga estando donde se lo investiga.
    throw error;
  }
}

/**
 * Desenvuelve la causa raíz de un error.
 *
 * Temporal envuelve lo que tira una actividad en un `ActivityFailure`, cuyo
 * mensaje es siempre «Activity task failed» — inservible para mostrárselo a
 * alguien. El motivo de verdad está unos niveles más abajo en la cadena de
 * `cause`.
 */
const describeFailure = (error: unknown): string => {
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current instanceof Error && current.cause && !seen.has(current)) {
    seen.add(current);
    current = current.cause;
  }

  if (current instanceof Error) {
    return current.message;
  }

  return typeof current === 'string' ? current : 'Error desconocido';
};

async function runGeneration(
  input: GenerateFormWorkflowInput,
): Promise<FormGenerationStatus> {
  const { formGenerationId } = input;

  /**
   * El veredicto va dentro de un objeto y no en un `let` suelto por una razón
   * de TypeScript, no de Temporal: el compilador no sigue las asignaciones que
   * ocurren dentro de un callback, así que después del `condition` seguiría
   * creyendo que un `let` vale `null`. Leyendo una propiedad, el estrechamiento
   * funciona.
   */
  const pending: { review: FormGenerationReviewSignal | null } = {
    review: null,
  };

  // El handler se registra antes de la primera espera. Si llegara una señal
  // antes de que exista el handler, Temporal la guarda y la entrega al
  // registrarlo — pero registrarlo temprano evita depender de eso.
  setHandler(reviewSignal, (review) => {
    pending.review = review;
  });

  await activities.markStatus({
    formGenerationId,
    status: formGenerationStatuses.retrieving,
  });

  const regulatoryContext = await retrieval.retrieveRegulatoryContext({
    prompt: input.prompt,
    documents: input.regulatoryDocuments,
  });

  const generated = await generateValidDraft({
    formGenerationId,
    prompt: input.prompt,
    regulatoryContext,
  });

  if (!generated.isValid) {
    await activities.failFormGeneration({
      formGenerationId,
      reason: `El modelo no produjo un formulario válido en ${generationPolicy.maxAttempts} intentos. Último problema: ${generated.problems[0] ?? 'desconocido'}`,
    });

    return formGenerationStatuses.failed;
  }

  // Deja la solicitud en AWAITING_REVIEW. La IA nunca publica sola: acá el
  // workflow se detiene hasta que una persona decida.
  await activities.saveGeneratedForm({
    formGenerationId,
    draft: generated.draft,
  });

  const wasReviewed = await condition(
    () => pending.review !== null,
    generationPolicy.reviewWindow,
  );

  const review = pending.review;

  if (!wasReviewed || !review) {
    await activities.failFormGeneration({
      formGenerationId,
      reason: `Nadie revisó el formulario en ${generationPolicy.reviewWindow}.`,
    });

    return formGenerationStatuses.failed;
  }

  await activities.applyReview({
    formGenerationId,
    decision: review.decision,
    reviewerNote: review.reviewerNote,
  });

  log.info('Generación revisada', {
    formGenerationId,
    decision: review.decision,
  });

  return review.decision === formGenerationReviewDecisions.approve
    ? formGenerationStatuses.approved
    : formGenerationStatuses.rejected;
}

type GenerateValidDraftInput = {
  formGenerationId: string;
  prompt: string;
  regulatoryContext: string;
};

/**
 * El bucle de reparación.
 *
 * Cada vuelta le devuelve al modelo, por escrito, qué estuvo mal en la
 * anterior. Es lo que distingue esto de reintentar a ciegas: un reintento sin
 * los errores adentro le pide exactamente lo mismo al mismo modelo, y con
 * temperatura baja devuelve casi siempre la misma respuesta inválida.
 *
 * Vive en el workflow y no en la política de reintentos de Temporal porque el
 * reintento de Temporal es para fallos de transporte —vuelve a ejecutar la
 * misma actividad con los mismos argumentos—. Acá los argumentos cambian.
 */
const generateValidDraft = async ({
  formGenerationId,
  prompt,
  regulatoryContext,
}: GenerateValidDraftInput) => {
  let problems: string[] = [];

  for (let attempt = 1; attempt <= generationPolicy.maxAttempts; attempt += 1) {
    await activities.markStatus({
      formGenerationId,
      // El primer intento genera; los siguientes reparan. Son estados
      // distintos porque para quien mira la pantalla significan cosas
      // distintas: «esto está tardando» vs. «esto está teniendo problemas».
      status:
        attempt === 1
          ? formGenerationStatuses.generating
          : formGenerationStatuses.repairing,
      attempts: attempt,
    });

    const raw = await generation.requestFormDraft({
      prompt,
      regulatoryContext,
      problems,
    });

    await activities.markStatus({
      formGenerationId,
      status: formGenerationStatuses.validating,
      attempts: attempt,
    });

    const validation = await activities.validateFormDraft({ raw });

    if (validation.isValid) {
      return validation;
    }

    problems = validation.problems;

    log.warn('El formulario generado no validó', {
      formGenerationId,
      attempt,
      problems,
    });
  }

  return { isValid: false as const, problems };
};
