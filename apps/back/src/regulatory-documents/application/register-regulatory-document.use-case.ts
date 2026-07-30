import type { DocumentIngestion } from '../domain/ports/document-ingestion.port';
import type { DocumentProcessingLauncher } from '../domain/ports/document-processing-launcher.port';
import type { RegulatoryDocumentRepository } from '../domain/ports/regulatory-document-repository.port';
import type { RegulatoryDocument } from '../domain/regulatory-document';
import { regulatoryDocumentStatuses } from '../domain/regulatory-document-status';
import type { UploadedFile } from '../domain/uploaded-file';

/**
 * Synchronous phase of registering a regulatory document.
 *
 * A bare TypeScript class, with no `@Injectable()`: the application does not
 * know Nest. The module instantiates it with a `useFactory` (see
 * `regulatory-documents.module.ts`), and the test builds it with three doubles
 * and zero infrastructure.
 *
 * The order matters: RAGFlow first, the row after. Done the other way around, a
 * failed upload would leave PENDING rows referencing nothing.
 */
export class RegisterRegulatoryDocumentUseCase {
  constructor(
    private readonly documents: RegulatoryDocumentRepository,
    private readonly ingestion: DocumentIngestion,
    private readonly processing: DocumentProcessingLauncher,
  ) {}

  async execute(file: UploadedFile): Promise<RegulatoryDocument> {
    // 1. Proxy the file to the ingestion engine (stores the binary, gives an id).
    const ingested = await this.ingestion.ingest(file);

    // 2. Our own row in PENDING, with the external id as the bridge.
    const document = await this.documents.create({
      ragflowDocumentId: ingested.documentId,
      ragflowDatasetId: ingested.datasetId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      status: regulatoryDocumentStatuses.pending,
    });

    // 3. Trigger the asynchronous processing. Only the id travels.
    await this.processing.launch(document.id);

    // 4. The controller returns 202: no result is awaited here.
    return document;
  }
}
