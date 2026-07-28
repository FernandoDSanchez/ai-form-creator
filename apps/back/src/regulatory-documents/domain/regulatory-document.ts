import type { RegulatoryDocumentStatus } from './regulatory-document-status';

/**
 * Documento regulatorio ya registrado: existe en RAGFlow y tiene fila propia.
 */
export type RegulatoryDocument = {
  id: string;
  /** `id` del documento del lado de RAGFlow. */
  ragflowDocumentId: string;
  /** Dataset de RAGFlow que lo contiene. */
  ragflowDatasetId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: RegulatoryDocumentStatus;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Lo que se le pasa al repositorio para crear la fila. El `id` y las fechas
 * los pone el adaptador de persistencia, no el caso de uso.
 */
export type NewRegulatoryDocument = Omit<
  RegulatoryDocument,
  'id' | 'createdAt' | 'updatedAt'
>;
