import type { FormGenerationStatus } from '../form-generation-status';

/**
 * Somebody tried to approve or reject something that is not ready for review
 * (or that has already been reviewed).
 *
 * This is the rule holding up "the AI never publishes on its own": the only
 * transition towards APPROVED starts at AWAITING_REVIEW and is triggered by a
 * person. It lives in the domain, not in the controller, because it is not a
 * validation of the request but the rule of the business.
 */
export class FormGenerationNotReviewableError extends Error {
  constructor(
    readonly formGenerationId: string,
    readonly status: FormGenerationStatus,
  ) {
    super(
      `Request ${formGenerationId} is in ${status}, and only what is ` +
        'awaiting review can be reviewed.',
    );
    this.name = 'FormGenerationNotReviewableError';
  }
}
