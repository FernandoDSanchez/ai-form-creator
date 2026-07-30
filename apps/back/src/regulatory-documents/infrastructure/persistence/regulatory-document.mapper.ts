import type { RegulatoryDocument as RegulatoryDocumentRow } from '@prisma/client';

import type { RegulatoryDocument } from '../../domain/regulatory-document';

/**
 * Postgres row → domain entity.
 *
 * Keeps `@prisma/client` from leaking into the core: the day the table gains an
 * audit column or gets split in two, the change dies here.
 *
 * It is also the only place where `DateTime` becomes an ISO 8601 string. The
 * entity is the contract shared with the front
 * (`@ai-form-creator/contracts`) and what travels over the wire is JSON, so the
 * conversion happens exactly once, at the persistence edge, and not in every
 * adapter that serialises the entity.
 */
export const toRegulatoryDocument = (
  row: RegulatoryDocumentRow,
): RegulatoryDocument => ({
  id: row.id,
  ragflowDocumentId: row.ragflowDocumentId,
  ragflowDatasetId: row.ragflowDatasetId,
  fileName: row.fileName,
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  // Prisma's enum and `regulatoryDocumentStatuses` share their literals, so
  // TypeScript accepts the direct assignment. If they diverged, the error would
  // surface here — which is exactly where we want to find out.
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
