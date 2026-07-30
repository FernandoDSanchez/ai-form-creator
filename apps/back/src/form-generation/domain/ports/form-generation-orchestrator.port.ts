import type { FormGenerationReview } from '@ai-form-creator/contracts/form-generation/form-generation';
import type { GenerateFormWorkflowInput } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';

/**
 * Outbound port towards whoever orchestrates the pipeline.
 *
 * The name does not mention Temporal (`CLAUDE.md` §9): the core asks for
 * somebody to start the generation and to hand over the human verdict; which
 * engine that happens on is decided by `form-generation.module.ts`.
 *
 * `submitReview` is here and not in the repository because the review is not a
 * write: it is unblocking a workflow that is halted waiting for it. The one
 * writing APPROVED/REJECTED into the database is still the worker, which means
 * there is a single owner of the statuses and the WebSocket event goes out the
 * same way as all the others.
 */
export type FormGenerationOrchestrator = {
  start(input: GenerateFormWorkflowInput): Promise<void>;
  submitReview(
    formGenerationId: string,
    review: FormGenerationReview,
  ): Promise<void>;
};

export const FORM_GENERATION_ORCHESTRATOR = Symbol(
  'FormGenerationOrchestrator',
);
