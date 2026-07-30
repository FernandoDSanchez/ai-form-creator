import type {
  FormDraftValidation,
  FormGenerationActivities,
  MarkStatusInput,
} from '../domain/ports/form-generation-activities.port';
import { toFormilySchema } from '../domain/to-formily-schema';
import { validateGeneratedForm } from '../domain/validate-generated-form';

import type { FormGenerationStore } from './form-generation-store';
import { requestFormDraft } from './litellm-client';
import { retrieveRegulatoryContext } from './ragflow-retrieval';

/**
 * Los adaptadores del worker, atados al puerto que declara `domain/ports/`.
 *
 * Es una fábrica y no un objeto suelto para que el pool de Postgres llegue por
 * parámetro: así el que decide cuándo se abre y cuándo se cierra es
 * `worker.ts`, que es la raíz de composición — mismo criterio que los
 * `useFactory` del back.
 *
 * Las funciones son finitas y aburridas a propósito. Cada una traduce entre el
 * puerto y un adaptador, y ninguna decide nada: lo que hay que decidir está en
 * `domain/`, y cuándo hacerlo está en el workflow.
 */
export const createFormGenerationActivities = (
  store: FormGenerationStore,
): FormGenerationActivities => ({
  markStatus: ({
    formGenerationId,
    status,
    attempts,
  }: MarkStatusInput): Promise<void> =>
    store.markStatus(formGenerationId, status, attempts),

  retrieveRegulatoryContext,

  requestFormDraft,

  // Pura, envuelta en actividad por determinismo. El porqué largo está en el
  // puerto, junto a la firma.
  validateFormDraft: ({ raw }): Promise<FormDraftValidation> =>
    Promise.resolve(validateGeneratedForm(raw)),

  saveGeneratedForm: ({ formGenerationId, draft }): Promise<void> =>
    store.saveGeneratedForm(formGenerationId, draft, toFormilySchema(draft)),

  failFormGeneration: ({ formGenerationId, reason }): Promise<void> =>
    store.failFormGeneration(formGenerationId, reason),

  applyReview: ({ formGenerationId, decision, reviewerNote }): Promise<void> =>
    store.applyReview(formGenerationId, decision, reviewerNote),
});
