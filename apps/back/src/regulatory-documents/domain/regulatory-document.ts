/**
 * Domain entity of the regulatory document.
 *
 * The definition does not live here but in `@ai-form-creator/contracts`,
 * because it is the same one the front consumes: one TypeBox schema, two apps.
 * This file remains the domain's door — the rest of the context keeps importing
 * `../domain/regulatory-document` and never learns where the type came from.
 *
 * A shared contract does not turn into infrastructure: it is a package with no
 * framework, no ORM and no HTTP, so the core can look at it without breaking
 * the inward dependency rule (`CLAUDE.md` §9).
 *
 * Watch out for the dates: `createdAt` and `updatedAt` are ISO 8601 strings,
 * not `Date`. That is what travels over JSON, and Prisma's `Date` is converted
 * exactly once, in
 * `infrastructure/persistence/regulatory-document.mapper.ts`.
 */
export {
  regulatoryDocumentSchema,
  newRegulatoryDocumentSchema,
  type RegulatoryDocument,
  type NewRegulatoryDocument,
} from '@ai-form-creator/contracts/regulatory-documents/regulatory-document';
