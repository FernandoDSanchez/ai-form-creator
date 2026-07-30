import { Type, type Static } from '@sinclair/typebox';

// Explicit extension: the ESM output needs it so Node can resolve the import
// at runtime. TypeScript maps it back to `.ts` when compiling.
import { formats } from '../formats.js';

import { regulatoryDocumentStatusSchema } from './regulatory-document-status.js';

/**
 * A regulatory document already registered: it exists in RAGFlow and has a row
 * of its own.
 *
 * This is the shared contract: the same definition is used by the back domain
 * (`apps/back/src/regulatory-documents/domain/regulatory-document.ts`) and by
 * the front data layer. That is why dates travel as ISO 8601 strings and not
 * as `Date`: what crosses the wire is JSON, and a `Date` on the front side
 * would be a type lie (a string arrives all the same). The conversion happens
 * exactly once, in the back's Prisma mapper.
 */
// The IIFE is not decoration. `/* @__PURE__ */ f(x)` says that `f` has no side
// effects, not that `x` has none: the nested calls below are arguments, and the
// bundler keeps them — along with the TypeBox import — even when it drops the
// outer call. Wrapping them in a function turns them into a body, and they go
// away with it. The long explanation is at the bottom of
// `form-generation/generated-form.ts`.
export const regulatoryDocumentSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      id: Type.String({ format: formats.uuid }),
      /** The document `id` on the RAGFlow side. */
      ragflowDocumentId: Type.String({ minLength: 1 }),
      /** The RAGFlow dataset holding it. */
      ragflowDatasetId: Type.String({ minLength: 1 }),
      fileName: Type.String({ minLength: 1 }),
      mimeType: Type.String({ minLength: 1 }),
      sizeBytes: Type.Integer({ minimum: 0 }),
      status: regulatoryDocumentStatusSchema,
      createdAt: Type.String({ format: formats.dateTime }),
      updatedAt: Type.String({ format: formats.dateTime }),
    },
    {
      $id: 'RegulatoryDocument',
      description: 'Regulatory document registered in the system.',
    },
  ))();

export type RegulatoryDocument = Static<typeof regulatoryDocumentSchema>;

/**
 * What gets handed to the repository to create the row. The `id` and the dates
 * are set by the persistence adapter, not by the use case.
 *
 * It is derived with `Type.Omit` instead of redeclared: adding a field to the
 * entity adds it here, and removing one breaks compilation where it should.
 */
export const newRegulatoryDocumentSchema = /* @__PURE__ */ Type.Omit(
  regulatoryDocumentSchema,
  ['id', 'createdAt', 'updatedAt'],
  { $id: 'NewRegulatoryDocument' },
);

export type NewRegulatoryDocument = Static<typeof newRegulatoryDocumentSchema>;
