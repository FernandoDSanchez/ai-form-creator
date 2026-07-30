import type { RegulatoryDocument } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document';

/**
 * Feature types. The entity is not declared here: it comes from
 * `@ai-form-creator/contracts`, the same TypeBox schema the back domain uses.
 * This file is only the feature's door, just like `domain/regulatory-document.ts`
 * on the back side.
 *
 * The type is re-exported and not the schema on purpose: the `Static<>` are
 * erased at compile time, whereas importing the schema would bring TypeBox into
 * the bundle without the front needing it for anything.
 */
export type {
  RegulatoryDocument,
  NewRegulatoryDocument,
} from '@ai-form-creator/contracts/regulatory-documents/regulatory-document';

export {
  regulatoryDocumentStatuses,
  type RegulatoryDocumentStatus,
} from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';

/**
 * What `POST /regulatory-documents` returns with its 202.
 *
 * It is not the whole entity: the back exposes a smaller view (see
 * `infrastructure/http/dto/regulatory-document.response.ts`), without
 * `mimeType` — which the client already knows, it just uploaded it — and
 * without `updatedAt` — which on upload is always equal to `createdAt`.
 *
 * It is derived with `Omit` instead of written by hand: if a contract field
 * changes, this finds out. If one day the back publishes more document
 * endpoints, it is worth moving this shape up to the package and deleting the
 * `Omit`.
 */
export type AcceptedRegulatoryDocument = Omit<
  RegulatoryDocument,
  'mimeType' | 'updatedAt'
>;
