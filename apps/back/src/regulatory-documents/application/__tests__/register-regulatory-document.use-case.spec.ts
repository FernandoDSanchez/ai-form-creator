import { DocumentIngestionFailedError } from '../../domain/errors/document-ingestion-failed.error';
import type {
  DocumentIngestion,
  IngestedDocument,
} from '../../domain/ports/document-ingestion.port';
import type { DocumentProcessingLauncher } from '../../domain/ports/document-processing-launcher.port';
import type { RegulatoryDocumentRepository } from '../../domain/ports/regulatory-document-repository.port';
import type {
  NewRegulatoryDocument,
  RegulatoryDocument,
} from '../../domain/regulatory-document';
import { regulatoryDocumentStatuses } from '../../domain/regulatory-document-status';
import type { UploadedFile } from '../../domain/uploaded-file';
import { RegisterRegulatoryDocumentUseCase } from '../register-regulatory-document.use-case';

/**
 * Cero infraestructura: ni Nest, ni Postgres, ni HTTP. Esa es la ventaja
 * concreta de que el caso de uso sólo dependa de puertos.
 */

const DOCUMENT_ID = 'e2f0b2ac-2c31-4a1f-9f1d-4a7d2e1a55aa';
const RAGFLOW_DOCUMENT_ID = 'b330ec2e91ec11efbc510242ac120004';
const RAGFLOW_DATASET_ID = '527fa74891e811ef9c650242ac120006';

const aPdf = (): UploadedFile => ({
  fileName: 'resolucion-1234.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  content: Buffer.from('%PDF-1.7'),
});

const anIngestion = (
  result: IngestedDocument = {
    documentId: RAGFLOW_DOCUMENT_ID,
    datasetId: RAGFLOW_DATASET_ID,
  },
): DocumentIngestion => ({ ingest: jest.fn().mockResolvedValue(result) });

const aRepository = (): RegulatoryDocumentRepository => ({
  create: jest
    .fn()
    .mockImplementation(
      (document: NewRegulatoryDocument): Promise<RegulatoryDocument> =>
        Promise.resolve({
          ...document,
          id: DOCUMENT_ID,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        }),
    ),
});

const aLauncher = (): DocumentProcessingLauncher => ({
  launch: jest.fn().mockResolvedValue(undefined),
});

describe('RegisterRegulatoryDocumentUseCase', () => {
  it('sube el archivo, guarda la fila en PENDING y dispara el procesamiento', async () => {
    const documents = aRepository();
    const ingestion = anIngestion();
    const processing = aLauncher();
    const file = aPdf();

    const useCase = new RegisterRegulatoryDocumentUseCase(
      documents,
      ingestion,
      processing,
    );

    const result = await useCase.execute(file);

    expect(ingestion.ingest).toHaveBeenCalledWith(file);
    expect(documents.create).toHaveBeenCalledWith({
      ragflowDocumentId: RAGFLOW_DOCUMENT_ID,
      ragflowDatasetId: RAGFLOW_DATASET_ID,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      status: regulatoryDocumentStatuses.pending,
    });
    expect(result.status).toBe(regulatoryDocumentStatuses.pending);
  });

  it('le pasa al procesamiento sólo el id interno, no el de RAGFlow', async () => {
    const processing = aLauncher();

    const useCase = new RegisterRegulatoryDocumentUseCase(
      aRepository(),
      anIngestion(),
      processing,
    );

    await useCase.execute(aPdf());

    expect(processing.launch).toHaveBeenCalledWith(DOCUMENT_ID);
    expect(processing.launch).toHaveBeenCalledTimes(1);
  });

  it('no crea la fila si la subida falla: nada de filas huérfanas', async () => {
    const documents = aRepository();
    const processing = aLauncher();
    const ingestion: DocumentIngestion = {
      ingest: jest
        .fn()
        .mockRejectedValue(new DocumentIngestionFailedError('caído')),
    };

    const useCase = new RegisterRegulatoryDocumentUseCase(
      documents,
      ingestion,
      processing,
    );

    await expect(useCase.execute(aPdf())).rejects.toBeInstanceOf(
      DocumentIngestionFailedError,
    );
    expect(documents.create).not.toHaveBeenCalled();
    expect(processing.launch).not.toHaveBeenCalled();
  });
});
