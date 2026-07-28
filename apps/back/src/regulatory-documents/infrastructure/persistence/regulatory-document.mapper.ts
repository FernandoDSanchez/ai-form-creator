import type { RegulatoryDocument as RegulatoryDocumentRow } from '@prisma/client';

import type { RegulatoryDocument } from '../../domain/regulatory-document';

/**
 * Fila de Postgres → entidad de dominio.
 *
 * Parece redundante hoy (los campos coinciden uno a uno) y sin embargo es lo
 * que evita que `@prisma/client` se filtre al núcleo: el día que la tabla gane
 * una columna de auditoría o se parta en dos, el cambio muere acá.
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
  // El enum de Prisma y `regulatoryDocumentStatuses` comparten literales, así
  // que TypeScript acepta la asignación directa. Si divergieran, el error
  // saltaría acá — que es justamente donde queremos enterarnos.
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
