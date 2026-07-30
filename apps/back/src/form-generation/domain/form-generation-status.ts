/**
 * Pipeline statuses. Same story as `form-generation.ts`: the list lives in the
 * shared contract and here it is only re-exported.
 */
export {
  formGenerationStatuses,
  formGenerationReviewDecisions,
  isTerminalFormGenerationStatus,
  type FormGenerationStatus,
  type FormGenerationReviewDecision,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';
