import type { RegulatoryDocument as RegulatoryDocumentRow } from '@prisma/client';

import type { RegulatoryDocument } from '../../domain/regulatory-document';

/**
 * Fila de Postgres → entidad de dominio.
 *
 * Evita que `@prisma/client` se filtre al núcleo: el día que la tabla gane una
 * columna de auditoría o se parta en dos, el cambio muere acá.
 *
 * Es además el único punto donde `DateTime` se vuelve string ISO 8601. La
 * entidad es el contrato compartido con el front (`@ai-form-creator/contracts`)
 * y por el cable viaja JSON, así que la conversión pasa una sola vez, en el
 * borde de la persistencia, y no en cada adaptador que serialice la entidad.
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
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
