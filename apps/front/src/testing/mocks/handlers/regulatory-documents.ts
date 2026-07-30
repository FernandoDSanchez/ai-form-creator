import { regulatoryDocumentStatuses } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';
import { delay, http, HttpResponse } from 'msw';

import { MOCK_API_LATENCY_MS } from '@/config/server-config';
import { regulatoryDocumentEndpoints } from '@/features/regulatory-documents/config/api-endpoints';
import type { AcceptedRegulatoryDocument } from '@/features/regulatory-documents/types/regulatory-document';

import { regulatoryDocumentsDb } from '../data/regulatory-documents';

const apiPath = (path: string) => `*${path}`;

/** 202: el back acepta el documento y sigue procesándolo en segundo plano. */
const ACCEPTED = 202;

/**
 * Catálogo fijo para el selector de la pantalla de generación. Estáticos a
 * propósito: lo que se prueba ahí es elegir documentos, no subirlos.
 */
const catalogue: AcceptedRegulatoryDocument[] = [
  {
    id: '3f1d9d2e-0b8a-4c5e-9f11-2a7b6c8d9e01',
    ragflowDocumentId: regulatoryDocumentsDb.ragflowDocumentId,
    ragflowDatasetId: regulatoryDocumentsDb.ragflowDatasetId,
    fileName: 'resolucion-1234-control-sanitario.pdf',
    sizeBytes: regulatoryDocumentsDb.sizeBytes,
    status: regulatoryDocumentStatuses.indexed,
    createdAt: '2026-07-20T10:00:00.000Z',
  },
  {
    id: '8c2a4b6d-1e3f-4a70-9b25-5d8e0f1a2b34',
    ragflowDocumentId: 'c441fd3fa2fd22f0cd620353ad231115',
    ragflowDatasetId: regulatoryDocumentsDb.ragflowDatasetId,
    fileName: 'providencia-aduanera-2026.pdf',
    sizeBytes: regulatoryDocumentsDb.sizeBytes,
    // Sin indexar: el selector lo ofrece igual, avisando que puede aportar
    // poco. Mientras el pipeline de ingesta no exista, éste es el caso normal.
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
