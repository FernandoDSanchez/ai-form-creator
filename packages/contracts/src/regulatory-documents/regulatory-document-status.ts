import { Type, type Static } from '@sinclair/typebox';

/**
 * Ingestion pipeline statuses.
 *
 * An `as const` object instead of an `enum` (`CLAUDE.md` §2): the back domain
 * does not depend on the enum Prisma generates, and the front does not have to
 * repeat the literals to map status → visual variant.
 */
export const regulatoryDocumentStatuses = {
  /** Already in RAGFlow, nobody has processed it yet. Initial status. */
  pending: 'PENDING',
  /** The workflow picked it up and is parsing/indexing it. */
  processing: 'PROCESSING',
  /** Chunks available for retrieval. */
  indexed: 'INDEXED',
  /** The pipeline failed; needs intervention. */
  failed: 'FAILED',
} as const;

/**
 * The same object, seen as a schema. `Type.Enum` derives the `anyOf` from the
 * values, so adding a status above adds it here too: there are no two lists
 * that can drift apart.
 *
 * The `@__PURE__` is not decorative: without it the bundler sees a function
 * call at module top level, assumes it may have side effects and pulls all of
 * TypeBox into the front bundle even when only the object above was imported.
 * With the annotation, if nobody uses the schema the call is dropped.
 */
export const regulatoryDocumentStatusSchema = /* @__PURE__ */ Type.Enum(
  regulatoryDocumentStatuses,
  {
    $id: 'RegulatoryDocumentStatus',
    description: 'Status of the document ingestion pipeline.',
  },
);

export type RegulatoryDocumentStatus = Static<
  typeof regulatoryDocumentStatusSchema
>;
