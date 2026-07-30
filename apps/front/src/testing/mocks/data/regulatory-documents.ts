import { regulatoryDocumentStatuses } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';

const MOCK_FILE_SIZE_BYTES = 2_400_000;

/**
 * What the mocked upload returns. The RAGFlow ids are opaque to the front: it
 * receives them and does not interpret them.
 */
export const regulatoryDocumentsDb = {
  ragflowDocumentId: 'b330ec2e91ec11efbc510242ac120004',
  ragflowDatasetId: '527fa74891e811ef9c650242ac120006',
  fileName: 'resolution-1234.pdf',
  sizeBytes: MOCK_FILE_SIZE_BYTES,
  /**
   * Always PENDING: the upload is asynchronous and the back answers before the
   * pipeline touches the file. That it is the contract literal and not a loose
   * `'PENDING'` is exactly what the shared package buys.
   */
  initialStatus: regulatoryDocumentStatuses.pending,
} as const;
