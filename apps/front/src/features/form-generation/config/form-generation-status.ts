import {
  formGenerationStatuses,
  type FormGenerationStatus,
} from '../types/form-generation';

/**
 * Variant Mapping: status → presentation. No `if/else` and no comparing against
 * loose strings, the map is indexed (`CLAUDE.md` §5).
 *
 * The keys come from the shared contract type, so the day the pipeline gains a
 * status, this `Record` stops compiling until somebody decides how it is
 * painted and what it tells the person who is waiting.
 *
 * `isBusy` is what makes the screen explain itself: it tells "this is still
 * moving, stay" apart from "this is done, look at the result".
 */
export const formGenerationStatusVariants: Record<
  FormGenerationStatus,
  { label: string; description: string; className: string; isBusy: boolean }
> = {
  [formGenerationStatuses.pending]: {
    label: 'Queued',
    description: 'The request is in. The orchestrator has yet to pick it up.',
    className: 'bg-surface-sunken text-content-muted border-border',
    isBusy: true,
  },
  [formGenerationStatuses.retrieving]: {
    label: 'Looking up regulations',
    description: 'Retrieving the chunks of the chosen documents.',
    className: 'bg-info-surface text-info border-info',
    isBusy: true,
  },
  [formGenerationStatuses.generating]: {
    label: 'Drafting',
    description: 'The model is putting the form together.',
    className: 'bg-info-surface text-info border-info',
    isBusy: true,
  },
  [formGenerationStatuses.validating]: {
    label: 'Validating',
    description: 'Checking what was generated against the allowed vocabulary.',
    className: 'bg-info-surface text-info border-info',
    isBusy: true,
  },
  [formGenerationStatuses.repairing]: {
    label: 'Correcting',
    description: 'It did not validate: the errors went back to the model.',
    className: 'bg-warning-surface text-warning border-warning',
    isBusy: true,
  },
  [formGenerationStatuses.awaitingReview]: {
    label: 'Awaiting review',
    description: 'There is a valid form. A person has yet to approve it.',
    className: 'bg-brand-50 text-brand-700 border-brand-200',
    isBusy: false,
  },
  [formGenerationStatuses.approved]: {
    label: 'Approved',
    description: 'Reviewed and approved by a person.',
    className: 'bg-success-surface text-success border-success',
    isBusy: false,
  },
  [formGenerationStatuses.rejected]: {
    label: 'Rejected',
    description: 'Reviewed and discarded by a person.',
    className: 'bg-surface-sunken text-content-muted border-border-strong',
    isBusy: false,
  },
  [formGenerationStatuses.failed]: {
    label: 'Failed',
    description: 'The pipeline could not finish.',
    className: 'bg-danger-surface text-danger border-danger',
    isBusy: false,
  },
};

/**
 * The happy path, for drawing the progress.
 *
 * It is a separate list and not `Object.keys` of the map above because terminal
 * statuses are not steps: APPROVED, REJECTED and FAILED are how it ends, not
 * where it passes through. REPAIRING does not show up either — it is a loop
 * over GENERATING, and showing it as a step of its own would make the bar seem
 * to go backwards.
 */
export const formGenerationProgressSteps = [
  formGenerationStatuses.pending,
  formGenerationStatuses.retrieving,
  formGenerationStatuses.generating,
  formGenerationStatuses.validating,
  formGenerationStatuses.awaitingReview,
] as const;
