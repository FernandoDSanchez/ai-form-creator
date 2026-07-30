/**
 * The feature's door to the shared contracts.
 *
 * Nothing is declared here: the entity, the statuses and the Formily schema
 * come from `@ai-form-creator/contracts`, the same ones the back domain and the
 * worker use. This file is only the door, just like
 * `regulatory-documents/types/regulatory-document.ts`.
 *
 * From the statuses the **value** is re-exported on top of the type: the
 * `Record` of visual variants needs them as keys at runtime. From the entity,
 * only the type — the `Static<>` are erased at compile time, whereas importing
 * the schema would bring TypeBox into the bundle without the front using it for
 * anything.
 */
export type {
  FormGeneration,
  NewFormGeneration,
  FormGenerationReview,
} from '@ai-form-creator/contracts/form-generation/form-generation';

export { formGenerationLimits } from '@ai-form-creator/contracts/form-generation/form-generation';

export {
  formGenerationStatuses,
  formGenerationReviewDecisions,
  isTerminalFormGenerationStatus,
  type FormGenerationStatus,
  type FormGenerationReviewDecision,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';

export type { FormilyFormSchema } from '@ai-form-creator/contracts/form-generation/formily-form-schema';

export type {
  GeneratedForm,
  GeneratedFormField,
} from '@ai-form-creator/contracts/form-generation/generated-form';
