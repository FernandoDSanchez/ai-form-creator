import { delay, http, HttpResponse } from 'msw';

import { MOCK_API_LATENCY_MS } from '@/config/server-config';
import { regulatoryDocumentEndpoints } from '@/features/regulatory-documents/config/api-endpoints';
import type { AcceptedRegulatoryDocument } from '@/features/regulatory-documents/types/regulatory-document';

import { regulatoryDocumentsDb } from '../data/regulatory-documents';

const apiPath = (path: string) => `*${path}`;

/** 202: el back acepta el documento y sigue procesándolo en segundo plano. */
const ACCEPTED = 202;

export const regulatoryDocumentsHandlers = [
  http.post(
    apiPath(regulatoryDocumentEndpoints.regulatoryDocuments),
    async () => {
      await delay(MOCK_API_LATENCY_MS);

      // No se lee el multipart a propósito. `request.formData()` anda en el
      // navegador pero explota bajo jsdom: el `File` que crea jsdom no pasa la
      // validación del parser multipart de undici (el de Node), y el handler
      // se cae con un ERR_ASSERTION. Como el resto de los mocks, este devuelve
      // el fixture; si algún día hace falta el eco del nombre real, va a haber
      // que resolver ese choque primero.
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
