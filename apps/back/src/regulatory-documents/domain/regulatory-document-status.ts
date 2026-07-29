/**
 * Estados del pipeline de ingesta.
 *
 * Igual que la entidad, se definen en `@ai-form-creator/contracts`: el front
 * necesita los mismos literales para mapear estado → variante visual, y una
 * segunda lista acá sería una lista que se desincroniza.
 *
 * Sigue siendo un objeto `as const` y no el enum de Prisma: renombrar una
 * columna no arrastra al núcleo.
 */
export {
  regulatoryDocumentStatuses,
  regulatoryDocumentStatusSchema,
  type RegulatoryDocumentStatus,
} from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';
