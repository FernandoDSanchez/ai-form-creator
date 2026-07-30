/**
 * Estados del pipeline. Misma historia que `form-generation.ts`: la lista vive
 * en el contrato compartido y acá sólo se reexporta.
 */
export {
  formGenerationStatuses,
  formGenerationReviewDecisions,
  isTerminalFormGenerationStatus,
  type FormGenerationStatus,
  type FormGenerationReviewDecision,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';
