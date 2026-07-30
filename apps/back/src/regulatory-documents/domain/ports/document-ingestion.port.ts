import type { UploadedFile } from '../uploaded-file';

/** What the ingestion engine returns once it accepted the file. */
export type IngestedDocument = {
  /** Identifier of the document in the ingestion engine. */
  documentId: string;
  /** Collection/dataset it ended up in. */
  datasetId: string;
};

/**
 * Outbound port towards the document ingestion engine.
 *
 * The name deliberately does not say "RAGFlow": the domain knows somebody
 * stores the file and returns an id, not who. Current adapter:
 * `infrastructure/ragflow/ragflow-document-ingestion.adapter.ts`.
 */
export type DocumentIngestion = {
  ingest(file: UploadedFile): Promise<IngestedDocument>;
};

export const DOCUMENT_INGESTION = Symbol('DocumentIngestion');
