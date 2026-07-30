import type { WorkflowRegulatoryDocument } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';

/**
 * What this context needs to know about regulatory documents: nothing beyond
 * their identifiers on the RAGFlow side.
 *
 * It is a port and not an import of `regulatory-documents/` on purpose, and not
 * only because ESLint forbids the cross import: the ban is there to force
 * exactly this question. What this context needs from the other one is a
 * three-field projection, and declaring it here writes that minimal agreement
 * down. The day ingestion changes engines, what breaks is the adapter, not this
 * context.
 *
 * The current adapter reads the other context's table directly with Prisma
 * (`infrastructure/persistence/prisma-regulatory-document-catalog.ts`). It is a
 * read and nothing more; if writing were ever needed, this becomes a call into
 * the other context's application layer.
 */
export type RegulatoryDocumentCatalog = {
  /**
   * Returns the ones that exist. The ones that do not simply do not come back:
   * comparing against what was asked for and deciding what to do with the
   * difference belongs to the use case.
   */
  findByIds(
    regulatoryDocumentIds: readonly string[],
  ): Promise<WorkflowRegulatoryDocument[]>;
};

export const REGULATORY_DOCUMENT_CATALOG = Symbol('RegulatoryDocumentCatalog');
