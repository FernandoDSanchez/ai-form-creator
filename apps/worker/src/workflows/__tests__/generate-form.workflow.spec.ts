import { formGenerationStatuses } from '@ai-form-creator/contracts/form-generation/form-generation-status';
import type { GenerateFormWorkflowInput } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';

import type { FormGenerationActivities } from '../../domain/ports/form-generation-activities.port';

/**
 * Este archivo prueba el **orden y las garantías** del workflow, no la lógica de
 * generar: las actividades son dobles.
 *
 * Lo que motivó escribirlo fue un fallo real en el despliegue. LiteLLM devolvió
 * 404 (habían retirado el modelo), el workflow murió como corresponde… y la fila
 * quedó en GENERATING para siempre, porque nadie escribió el fallo. Temporal lo
 * registraba, pero la base no, y sin cambio de estado no hay `NOTIFY`: el front
 * se quedó mostrando «Redactando…» indefinidamente.
 *
 * Corre contra el servidor de prueba del SDK, que arranca un Temporal de
 * verdad en memoria y salta el tiempo. Por eso una espera de 30 días tarda
 * milisegundos.
 */

const TASK_QUEUE = 'test-form-generation';
const FORM_GENERATION_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const anInput = (): GenerateFormWorkflowInput => ({
  formGenerationId: FORM_GENERATION_ID,
  prompt: 'Formulario de declaración de importación.',
  regulatoryDocuments: [],
});

const aDraft = () => ({
  title: 'Declaración de importación',
  description: '',
  fields: [
    {
      name: 'entityLegalName' as const,
      title: 'Razón social',
      component: 'TextField' as const,
      isRequired: true,
      helpText: '',
      placeholder: '',
      options: [],
    },
  ],
});

/** Dobles que registran lo que se les pidió. */
const createActivities = (
  overrides: Partial<FormGenerationActivities> = {},
): FormGenerationActivities => ({
  markStatus: jest.fn().mockResolvedValue(undefined),
  retrieveRegulatoryContext: jest.fn().mockResolvedValue(''),
  requestFormDraft: jest.fn().mockResolvedValue(JSON.stringify(aDraft())),
  validateFormDraft: jest
    .fn()
    .mockResolvedValue({ isValid: true, draft: aDraft() }),
  saveGeneratedForm: jest.fn().mockResolvedValue(undefined),
  failFormGeneration: jest.fn().mockResolvedValue(undefined),
  applyReview: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('generateForm', () => {
  let env: TestWorkflowEnvironment;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();
  }, 120_000);

  afterAll(async () => {
    await env?.teardown();
  });

  const runWith = async (
    activities: FormGenerationActivities,
    onStarted?: (handle: {
      signal: (name: string, payload: unknown) => Promise<void>;
    }) => Promise<void>,
  ): Promise<unknown> => {
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: TASK_QUEUE,
      workflowsPath: require.resolve('../generate-form.workflow'),
      activities,
    });

    return worker.runUntil(async (): Promise<unknown> => {
      const handle = await env.client.workflow.start('generateForm', {
        taskQueue: TASK_QUEUE,
        workflowId: `test-${Math.random().toString(36).slice(2)}`,
        args: [anInput()],
      });

      await onStarted?.(handle as never);

      return handle.result();
    });
  };

  it('marca FAILED en la base cuando una actividad falla sin remedio', async () => {
    // El caso exacto que se rompió en producción: LiteLLM devolviendo 404.
    const activities = createActivities({
      requestFormDraft: jest
        .fn()
        .mockRejectedValue(new Error('LiteLLM respondió HTTP 404')),
    });

    await expect(runWith(activities)).rejects.toThrow();

    expect(activities.failFormGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ formGenerationId: FORM_GENERATION_ID }),
    );
  });

  it('propaga el motivo real y no el «Activity task failed» de Temporal', async () => {
    const activities = createActivities({
      requestFormDraft: jest
        .fn()
        .mockRejectedValue(new Error('el modelo ya no está disponible')),
    });

    await expect(runWith(activities)).rejects.toThrow();

    const [call] = (activities.failFormGeneration as jest.Mock).mock.calls.at(
      -1,
    ) as [{ reason: string }];

    expect(call.reason).toContain('el modelo ya no está disponible');
  });

  it('se detiene en AWAITING_REVIEW y espera: la IA no publica sola', async () => {
    const activities = createActivities();

    const status = await runWith(activities, async (handle) => {
      // El workflow tiene que seguir vivo hasta que llegue la señal. Si
      // publicara solo, `result()` habría resuelto sin esto.
      await handle.signal('review', {
        decision: 'APPROVE',
        reviewerNote: 'ok',
      });
    });

    expect(activities.saveGeneratedForm).toHaveBeenCalledTimes(1);
    expect(activities.applyReview).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'APPROVE' }),
    );
    expect(status).toBe(formGenerationStatuses.approved);
  });

  it('reintenta con los errores adentro y se rinde tras el tope', async () => {
    const activities = createActivities({
      validateFormDraft: jest
        .fn()
        .mockResolvedValue({ isValid: false, problems: ['falta `options`'] }),
    });

    const status = await runWith(activities);

    // Tres intentos, y a partir del segundo el prompt lleva los problemas del
    // anterior: eso es lo que separa un reintento útil de repetir el pedido.
    expect(activities.requestFormDraft).toHaveBeenCalledTimes(3);
    expect(
      (activities.requestFormDraft as jest.Mock).mock.calls[1]?.[0].problems,
    ).toEqual(['falta `options`']);
    expect(activities.saveGeneratedForm).not.toHaveBeenCalled();
    expect(status).toBe(formGenerationStatuses.failed);
  });
});
