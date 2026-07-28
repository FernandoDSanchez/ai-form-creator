import type { UploadedFile } from '../uploaded-file';

/** Lo que devuelve el motor de ingesta una vez que aceptó el archivo. */
export type IngestedDocument = {
  /** Identificador del documento en el motor de ingesta. */
  documentId: string;
  /** Colección/dataset donde quedó. */
  datasetId: string;
};

/**
 * Puerto de salida hacia el motor de ingesta documental.
 *
 * El nombre no dice "RAGFlow" a propósito: el dominio sabe que alguien guarda
 * el archivo y devuelve un id, no quién. Adaptador actual:
 * `infrastructure/ragflow/ragflow-document-ingestion.adapter.ts`.
 */
export type DocumentIngestion = {
  ingest(file: UploadedFile): Promise<IngestedDocument>;
};

export const DOCUMENT_INGESTION = Symbol('DocumentIngestion');
