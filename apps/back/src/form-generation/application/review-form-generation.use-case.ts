import { FormGenerationNotFoundError } from '../domain/errors/form-generation-not-found.error';
import { FormGenerationNotReviewableError } from '../domain/errors/form-generation-not-reviewable.error';
import type { FormGenerationReview } from '../domain/form-generation';
import { formGenerationStatuses } from '../domain/form-generation-status';
import type { FormGenerationOrchestrator } from '../domain/ports/form-generation-orchestrator.port';
import type { FormGenerationRepository } from '../domain/ports/form-generation-repository.port';

/**
 * The human verdict.
 *
 * It does not write the status: it sends it as a signal to the workflow, which
 * is halted waiting for it, and the workflow is the one writing APPROVED or
 * REJECTED. It might look like the long way round — the back has the database
 * connection right there — but it is what keeps a single owner of the statuses.
 * If the back wrote here and the worker wrote in the rest of the pipeline,
 * there would be two processes competing for the same row and no way of knowing
 * which one arrived last.
 *
 * The AWAITING_REVIEW check is the business rule, not a request validation: it
 * is what holds up the AI not publishing on its own. It is done even though the
 * workflow would reject the signal by itself, because a `condition` ignoring a
 * signal looks like "nothing happened", and here it has to look like a 409.
 */
export class ReviewFormGenerationUseCase {
  constructor(
    private readonly formGenerations: FormGenerationRepository,
    private readonly orchestrator: FormGenerationOrchestrator,
  ) {}

  async execute(
    formGenerationId: string,
    review: FormGenerationReview,
  ): Promise<void> {
    const formGeneration =
      await this.formGenerations.findById(formGenerationId);

    if (!formGeneration) {
      throw new FormGenerationNotFoundError(formGenerationId);
    }

    if (formGeneration.status !== formGenerationStatuses.awaitingReview) {
      throw new FormGenerationNotReviewableError(
        formGenerationId,
        formGeneration.status,
      );
    }

    await this.orchestrator.submitReview(formGenerationId, review);
  }
}
