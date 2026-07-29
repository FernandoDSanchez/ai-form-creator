import { Type, type Static } from '@sinclair/typebox';

/**
 * Estados del pipeline de ingesta.
 *
 * Objeto `as const` en vez de `enum` (`CLAUDE.md` §2): ni el dominio del back
 * depende del enum que genera Prisma, ni el front tiene que repetir los
 * literales para mapear estado → variante visual.
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

/**
 * El mismo objeto, visto como schema. `Type.Enum` deriva el `anyOf` de los
 * valores, así que agregar un estado arriba lo agrega también acá: no hay dos
 * listas que se puedan desincronizar.
 *
 * El `@__PURE__` no es decorativo: sin él, el bundler ve una llamada a función
 * en el tope del módulo, asume que puede tener efectos y se trae TypeBox
 * entero al bundle del front aunque sólo se haya importado el objeto de
 * arriba. Con la anotación, si nadie usa el schema, la llamada se descarta.
 */
export const regulatoryDocumentStatusSchema = /* @__PURE__ */ Type.Enum(
  regulatoryDocumentStatuses,
  {
    $id: 'RegulatoryDocumentStatus',
    description: 'Estado del pipeline de ingesta del documento.',
  },
);

export type RegulatoryDocumentStatus = Static<
  typeof regulatoryDocumentStatusSchema
>;
