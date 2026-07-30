/**
 * Ingestion pipeline statuses.
 *
 * Like the entity, they are defined in `@ai-form-creator/contracts`: the front
 * needs the same literals to map status → visual variant, and a second list
 * here would be a list that drifts.
 *
 * It is still an `as const` object and not Prisma's enum: renaming a column
 * does not drag the core along.
 */
export {
  regulatoryDocumentStatuses,
  regulatoryDocumentStatusSchema,
  type RegulatoryDocumentStatus,
} from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';
