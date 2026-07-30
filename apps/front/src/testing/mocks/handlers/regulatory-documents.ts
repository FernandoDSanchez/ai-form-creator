import { regulatoryDocumentStatuses } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';
import { delay, http, HttpResponse } from 'msw';

import { MOCK_API_LATENCY_MS } from '@/config/server-config';
import { regulatoryDocumentEndpoints } from '@/features/regulatory-documents/config/api-endpoints';
import type { AcceptedRegulatoryDocument } from '@/features/regulatory-documents/types/regulatory-document';

import { regulatoryDocumentsDb } from '../data/regulatory-documents';

const apiPath = (path: string) => `*${path}`;

/** 202: the back accepts the document and keeps processing it in the background. */
const ACCEPTED = 202;

/**
 * Fixed catalogue for the picker of the generation screen. Static on purpose:
 * what is tested there is choosing documents, not uploading them.
 */
const catalogue: AcceptedRegulatoryDocument[] = [
  {
    id: '3f1d9d2e-0b8a-4c5e-9f11-2a7b6c8d9e01',
    ragflowDocumentId: regulatoryDocumentsDb.ragflowDocumentId,
    ragflowDatasetId: regulatoryDocumentsDb.ragflowDatasetId,
    fileName: 'resolution-1234-sanitary-control.pdf',
    sizeBytes: regulatoryDocumentsDb.sizeBytes,
    status: regulatoryDocumentStatuses.indexed,
    createdAt: '2026-07-20T10:00:00.000Z',
  },
  {
    id: '8c2a4b6d-1e3f-4a70-9b25-5d8e0f1a2b34',
    ragflowDocumentId: 'c441fd3fa2fd22f0cd620353ad231115',
    ragflowDatasetId: regulatoryDocumentsDb.ragflowDatasetId,
    fileName: 'customs-ruling-2026.pdf',
    sizeBytes: regulatoryDocumentsDb.sizeBytes,
    // Not indexed: the picker offers it anyway, warning that it may contribute
    // little. While the ingestion pipeline does not exist, this is the normal
    // case.
    status: regulatoryDocumentStatuses.pending,
    createdAt: '2026-07-26T09:15:00.000Z',
  },
];

export const regulatoryDocumentsHandlers = [
  http.get(
    apiPath(regulatoryDocumentEndpoints.regulatoryDocuments),
    async () => {
      await delay(MOCK_API_LATENCY_MS);

      return HttpResponse.json(catalogue);
    },
  ),

  http.post(
    apiPath(regulatoryDocumentEndpoints.regulatoryDocuments),
    async () => {
      await delay(MOCK_API_LATENCY_MS);

      // The multipart is deliberately not read. `request.formData()` works in
      // the browser but blows up under jsdom: the `File` jsdom creates does not
      // pass undici's multipart parser validation (Node's), and the handler
      // dies with an ERR_ASSERTION. Like the rest of the mocks, this one
      // returns the fixture; if one day echoing the real name is needed, that
      // clash has to be solved first.
      const accepted: AcceptedRegulatoryDocument = {
        id: crypto.randomUUID(),
        ragflowDocumentId: regulatoryDocumentsDb.ragflowDocumentId,
        ragflowDatasetId: regulatoryDocumentsDb.ragflowDatasetId,
        fileName: regulatoryDocumentsDb.fileName,
        sizeBytes: regulatoryDocumentsDb.sizeBytes,
        status: regulatoryDocumentsDb.initialStatus,
        createdAt: new Date().toISOString(),
      };

      return HttpResponse.json(accepted, { status: ACCEPTED });
    },
  ),
];
