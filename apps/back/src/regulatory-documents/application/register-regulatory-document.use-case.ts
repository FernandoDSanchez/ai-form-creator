import type { DocumentIngestion } from '../domain/ports/document-ingestion.port';
import type { DocumentProcessingLauncher } from '../domain/ports/document-processing-launcher.port';
import type { RegulatoryDocumentRepository } from '../domain/ports/regulatory-document-repository.port';
import type { RegulatoryDocument } from '../domain/regulatory-document';
import { regulatoryDocumentStatuses } from '../domain/regulatory-document-status';
import type { UploadedFile } from '../domain/uploaded-file';

/**
 * Fase síncrona del alta de un documento regulatorio.
 *
 * Clase de TypeScript pelada, sin `@Injectable()`: la aplicación no conoce
 * Nest. El módulo la instancia con un `useFactory` (ver
 * `regulatory-documents.module.ts`), y el test la construye con tres dobles y
 * cero infraestructura.
 *
 * El orden importa: primero RAGFlow, después la fila. Si se hiciera al revés,
 * un fallo de la subida dejaría filas PENDING que no referencian nada.
 */
export class RegisterRegulatoryDocumentUseCase {
  constructor(
    private readonly documents: RegulatoryDocumentRepository,
    private readonly ingestion: DocumentIngestion,
    private readonly processing: DocumentProcessingLauncher,
  ) {}

  async execute(file: UploadedFile): Promise<RegulatoryDocument> {
    // 1. Proxy del archivo al motor de ingesta (guarda el binario y da un id).
    const ingested = await this.ingestion.ingest(file);

    // 2. Fila propia en PENDING, con el id externo como puente.
    const document = await this.documents.create({
      ragflowDocumentId: ingested.documentId,
      ragflowDatasetId: ingested.datasetId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      status: regulatoryDocumentStatuses.pending,
    });

    // 3. Disparo del procesamiento asíncrono. Sólo viaja el id.
    await this.processing.launch(document.id);

    // 4. El controlador devuelve 202: acá no se espera ningún resultado.
    return document;
  }
}
