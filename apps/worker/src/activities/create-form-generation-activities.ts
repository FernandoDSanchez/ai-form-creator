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
 * The worker adapters, tied to the port `domain/ports/` declares.
 *
 * It is a factory and not a loose object so the Postgres pool arrives as a
 * parameter: that way the one deciding when it opens and when it closes is
 * `worker.ts`, which is the composition root — same criterion as the back's
 * `useFactory` providers.
 *
 * The functions are small and boring on purpose. Each one translates between
 * the port and an adapter, and none of them decides anything: what has to be
 * decided is in `domain/`, and when to do it is in the workflow.
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

  // Pure, wrapped in an activity for determinism. The long why is in the port,
  // next to the signature.
  validateFormDraft: ({ raw }): Promise<FormDraftValidation> =>
    Promise.resolve(validateGeneratedForm(raw)),

  saveGeneratedForm: ({ formGenerationId, draft }): Promise<void> =>
    store.saveGeneratedForm(formGenerationId, draft, toFormilySchema(draft)),

  failFormGeneration: ({ formGenerationId, reason }): Promise<void> =>
    store.failFormGeneration(formGenerationId, reason),

  applyReview: ({ formGenerationId, decision, reviewerNote }): Promise<void> =>
    store.applyReview(formGenerationId, decision, reviewerNote),
});
