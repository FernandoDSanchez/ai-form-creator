import {
  formFieldComponents,
  formFieldDecorators,
} from '@ai-form-creator/contracts/form-generation/form-field-component';
import { formFieldNames } from '@ai-form-creator/contracts/form-generation/form-field-name';
import type {
  FormGeneration,
  NewFormGeneration,
} from '@ai-form-creator/contracts/form-generation/form-generation';
import { formGenerationStatuses } from '@ai-form-creator/contracts/form-generation/form-generation-status';
import type { FormilyFormSchema } from '@ai-form-creator/contracts/form-generation/formily-form-schema';
import type { GeneratedForm } from '@ai-form-creator/contracts/form-generation/generated-form';

/**
 * Simulación del pipeline entero, en memoria.
 *
 * Con la API mockeada no hay Temporal ni WebSocket, así que el avance se
 * simula: cada lectura del detalle mueve la solicitud un paso. El front hace
 * polling mientras el estado no sea terminal, con lo cual la pantalla recorre
 * el pipeline igual que contra el back real — sólo que al ritmo del refetch.
 *
 * Sirve para dos cosas: desarrollar la pantalla sin el cluster levantado, y
 * dejar el recorrido documentado en código.
 */

/** El recorrido feliz, en orden. El último es donde se detiene a esperar. */
const statusSequence = [
  formGenerationStatuses.pending,
  formGenerationStatuses.retrieving,
  formGenerationStatuses.generating,
  formGenerationStatuses.validating,
  formGenerationStatuses.awaitingReview,
] as const;

const sampleDraft: GeneratedForm = {
  title: 'Declaración de importación con control sanitario',
  description:
    'Datos exigidos para el ingreso de mercancía sujeta a control sanitario.',
  fields: [
    {
      name: formFieldNames.importerTaxId,
      title: 'Identificación del importador',
      component: formFieldComponents.text,
      isRequired: true,
      helpText: 'Tal como figura en el registro aduanero.',
      placeholder: 'J-12345678-9',
      options: [],
    },
    {
      name: formFieldNames.hsTariffCode,
      title: 'Código arancelario',
      component: formFieldComponents.text,
      isRequired: true,
      helpText: '',
      placeholder: '0201.10.00',
      options: [],
    },
    {
      name: formFieldNames.customsRegime,
      title: 'Régimen aduanero',
      component: formFieldComponents.select,
      isRequired: true,
      helpText: '',
      placeholder: '',
      options: [
        { label: 'Importación definitiva', value: 'definitiva' },
        { label: 'Admisión temporal', value: 'temporal' },
        { label: 'Tránsito aduanero', value: 'transito' },
      ],
    },
    {
      name: formFieldNames.arrivalDate,
      title: 'Fecha de arribo',
      component: formFieldComponents.date,
      isRequired: true,
      helpText: '',
      placeholder: '',
      options: [],
    },
    {
      name: formFieldNames.declarationAccepted,
      title: 'Declaración jurada',
      component: formFieldComponents.checkbox,
      isRequired: true,
      helpText: 'Conozco las sanciones por declaración falsa.',
      placeholder: '',
      options: [],
    },
  ],
};

/**
 * El borrador ya compilado.
 *
 * Escrito a mano porque el compilador vive en `apps/worker` y el front no lo
 * tiene. Es la única parte del mock que puede desincronizarse de lo real; los
 * nombres salen igual de las constantes del contrato, así que lo que podría
 * divergir es la forma, no el vocabulario.
 */
const sampleFormilySchema: FormilyFormSchema = {
  type: 'object',
  properties: Object.fromEntries(
    sampleDraft.fields.map((field) => [
      field.name,
      {
        type: (
          {
            [formFieldComponents.text]: 'string',
            [formFieldComponents.textarea]: 'string',
            [formFieldComponents.number]: 'number',
            [formFieldComponents.select]: 'string',
            [formFieldComponents.checkbox]: 'boolean',
            [formFieldComponents.radioGroup]: 'string',
            [formFieldComponents.date]: 'string',
          } as const
        )[field.component],
        title: field.title,
        required: field.isRequired,
        ...(field.options.length > 0 ? { enum: field.options } : {}),
        ...(field.placeholder.length > 0
          ? { 'x-component-props': { placeholder: field.placeholder } }
          : {}),
        ...(field.helpText.length > 0
          ? { 'x-decorator-props': { help: field.helpText } }
          : {}),
        'x-decorator': formFieldDecorators.formItem,
        'x-component': field.component,
      },
    ]),
  ),
};

const formGenerationsDb = new Map<string, FormGeneration>();

export const createFormGeneration = (
  request: NewFormGeneration,
): FormGeneration => {
  const now = new Date().toISOString();
  const formGeneration: FormGeneration = {
    id: crypto.randomUUID(),
    prompt: request.prompt,
    regulatoryDocumentIds: request.regulatoryDocumentIds,
    status: formGenerationStatuses.pending,
    attempts: 0,
    draft: null,
    formilySchema: null,
    failureReason: null,
    reviewerNote: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  formGenerationsDb.set(formGeneration.id, formGeneration);

  return formGeneration;
};

export const listFormGenerations = (): FormGeneration[] =>
  [...formGenerationsDb.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

/**
 * Devuelve la solicitud y, de paso, la hace avanzar un paso.
 *
 * Que leer tenga efecto es una mentira deliberada del mock: lo que en el
 * sistema real mueve el estado es el worker, y acá no hay worker. El polling
 * del front hace las veces de reloj.
 */
export const advanceFormGeneration = (
  formGenerationId: string,
): FormGeneration | null => {
  const current = formGenerationsDb.get(formGenerationId);

  if (!current) {
    return null;
  }

  const index = statusSequence.indexOf(
    current.status as (typeof statusSequence)[number],
  );

  // Fuera de la secuencia (terminal) o ya en el último paso: no se mueve más.
  if (index < 0 || index === statusSequence.length - 1) {
    return current;
  }

  const nextStatus = statusSequence[index + 1] ?? current.status;
  const isReady = nextStatus === formGenerationStatuses.awaitingReview;

  const advanced: FormGeneration = {
    ...current,
    status: nextStatus,
    attempts:
      nextStatus === formGenerationStatuses.generating ? 1 : current.attempts,
    draft: isReady ? sampleDraft : current.draft,
    formilySchema: isReady ? sampleFormilySchema : current.formilySchema,
    updatedAt: new Date().toISOString(),
  };

  formGenerationsDb.set(formGenerationId, advanced);

  return advanced;
};

export const reviewFormGeneration = (
  formGenerationId: string,
  status: FormGeneration['status'],
  reviewerNote: string,
): FormGeneration | null => {
  const current = formGenerationsDb.get(formGenerationId);

  if (!current) {
    return null;
  }

  const reviewed: FormGeneration = {
    ...current,
    status,
    reviewerNote,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  formGenerationsDb.set(formGenerationId, reviewed);

  return reviewed;
};

/** Los tests arrancan de cero: el mapa vive entre archivos de test. */
export const resetFormGenerations = (): void => {
  formGenerationsDb.clear();
};
