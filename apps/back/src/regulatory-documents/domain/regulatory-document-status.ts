/**
 * Estados del pipeline de ingesta.
 *
 * Objeto `as const` en vez de `enum` (misma convención que el front,
 * `CLAUDE.md` §2): el dominio no depende del enum que genera Prisma, así que
 * renombrar una columna no arrastra al núcleo.
 */
export const regulatoryDocumentStatuses = {
  /** Ya está en RAGFlow, todavía no lo procesó nadie. Estado inicial. */
  pending: 'PENDING',
  /** El workflow lo tomó y está parseando/indexando. */
  processing: 'PROCESSING',
  /** Chunks disponibles para recuperación. */
  indexed: 'INDEXED',
  /** El pipeline falló; requiere intervención. */
  failed: 'FAILED',
} as const;

export type RegulatoryDocumentStatus =
  (typeof regulatoryDocumentStatuses)[keyof typeof regulatoryDocumentStatuses];
