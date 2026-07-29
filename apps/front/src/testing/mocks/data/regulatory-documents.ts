import { regulatoryDocumentStatuses } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';

const MOCK_FILE_SIZE_BYTES = 2_400_000;

/**
 * Lo que devuelve el alta mockeada. Los ids de RAGFlow son opacos para el
 * front: le llegan y no los interpreta.
 */
export const regulatoryDocumentsDb = {
  ragflowDocumentId: 'b330ec2e91ec11efbc510242ac120004',
  ragflowDatasetId: '527fa74891e811ef9c650242ac120006',
  fileName: 'resolucion-1234.pdf',
  sizeBytes: MOCK_FILE_SIZE_BYTES,
  /**
   * Siempre PENDING: el alta es asíncrona y el back responde antes de que el
   * pipeline toque el archivo. Que sea el literal del contrato y no un
   * `'PENDING'` suelto es justamente lo que compra el paquete compartido.
   */
  initialStatus: regulatoryDocumentStatuses.pending,
} as const;
