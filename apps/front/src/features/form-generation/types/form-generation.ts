/**
 * La puerta de la feature a los contratos compartidos.
 *
 * Nada se declara acá: la entidad, los estados y el schema de Formily salen de
 * `@ai-form-creator/contracts`, los mismos que usan el dominio del back y el
 * worker. Este archivo es sólo la puerta, igual que
 * `regulatory-documents/types/regulatory-document.ts`.
 *
 * De los estados se reexporta el **valor** además del tipo: el `Record` de
 * variantes visuales los necesita como claves en runtime. De la entidad, sólo
 * el tipo — los `Static<>` se borran al compilar, mientras que importar el
 * schema traería TypeBox al bundle sin que el front lo use para nada.
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
