/**
 * The core's door to the entity.
 *
 * It is not declared here: it lives in `@ai-form-creator/contracts`, the same
 * schema the front consumes and the one the worker validates the model's answer
 * against. This file only exposes it inwards, just like
 * `regulatory-documents/domain/regulatory-document.ts`.
 *
 * A shared contract does not turn into infrastructure: it is a package with no
 * framework, no ORM and no HTTP, so the domain can look at it without breaking
 * the inward dependency rule (`CLAUDE.md` §9).
 */
export type {
  FormGeneration,
  NewFormGeneration,
  FormGenerationReview,
} from '@ai-form-creator/contracts/form-generation/form-generation';

export { formGenerationLimits } from '@ai-form-creator/contracts/form-generation/form-generation';
