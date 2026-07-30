import type { RegulatoryDocumentRepository } from '../domain/ports/regulatory-document-repository.port';
import type { RegulatoryDocument } from '../domain/regulatory-document';

/**
 * Listado de documentos, del más reciente al más viejo.
 *
 * Lo pide el selector del front: para generar un formulario hay que elegir
 * contra qué documentos, y hasta ahora la única forma de conocerlos era
 * haberlos subido en esa misma sesión.
 */
export class ListRegulatoryDocumentsUseCase {
  constructor(private readonly documents: RegulatoryDocumentRepository) {}

  execute(): Promise<RegulatoryDocument[]> {
    return this.documents.findAll();
  }
}
