import type { RegulatoryDocumentRepository } from '../domain/ports/regulatory-document-repository.port';
import type { RegulatoryDocument } from '../domain/regulatory-document';

/**
 * List of documents, from the most recent to the oldest.
 *
 * The front's picker asks for it: generating a form requires choosing which
 * documents to generate against, and until now the only way of knowing them was
 * having uploaded them in that very session.
 */
export class ListRegulatoryDocumentsUseCase {
  constructor(private readonly documents: RegulatoryDocumentRepository) {}

  execute(): Promise<RegulatoryDocument[]> {
    return this.documents.findAll();
  }
}
