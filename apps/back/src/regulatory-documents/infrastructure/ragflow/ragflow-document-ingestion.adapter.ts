import { Injectable, Logger } from '@nestjs/common';

import { DocumentIngestionFailedError } from '../../domain/errors/document-ingestion-failed.error';
import type {
  DocumentIngestion,
  IngestedDocument,
} from '../../domain/ports/document-ingestion.port';
import type { UploadedFile } from '../../domain/uploaded-file';

import {
  RAGFLOW_FILE_FIELD,
  RAGFLOW_SUCCESS_CODE,
  ragflowEndpoints,
} from './ragflow-endpoints';
import { ragflowUploadResponseSchema } from './ragflow-response.schema';

export type RagflowIngestionConfig = {
  apiUrl: string;
  apiKey: string;
  datasetId: string;
  timeoutMs: number;
};

/**
 * Adaptador de salida: sube el archivo a RAGFlow, que lo persiste en su MinIO
 * y devuelve el `document_id`.
 *
 * La config llega por constructor (la arma el módulo desde `config/env.ts`) en
 * vez de importar `env` acá: así el test instancia el adaptador con una URL
 * falsa sin montar todo el entorno.
 *
 * Usa el `fetch` nativo de Node — no hace falta axios para una sola llamada.
 */
@Injectable()
export class RagflowDocumentIngestionAdapter implements DocumentIngestion {
  private readonly logger = new Logger(RagflowDocumentIngestionAdapter.name);

  constructor(private readonly config: RagflowIngestionConfig) {}

  async ingest(file: UploadedFile): Promise<IngestedDocument> {
    const { datasetId } = this.config;
    const url = `${this.config.apiUrl}${ragflowEndpoints.uploadDocuments(datasetId)}`;

    const form = new FormData();
    form.append(
      RAGFLOW_FILE_FIELD,
      new Blob([new Uint8Array(file.content)], { type: file.mimeType }),
      file.fileName,
    );

    const response = await this.post(url, form);

    if (!response.ok) {
      throw new DocumentIngestionFailedError(
        `RAGFlow respondió HTTP ${response.status}`,
      );
    }

    const parsed = ragflowUploadResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new DocumentIngestionFailedError(
        'la respuesta de RAGFlow no tiene la forma esperada',
        { cause: parsed.error },
      );
    }

    const body = parsed.data;

    if (body.code !== RAGFLOW_SUCCESS_CODE) {
      throw new DocumentIngestionFailedError(
        body.message ?? `RAGFlow devolvió code ${body.code}`,
      );
    }

    // `data` es un array porque el endpoint acepta subidas múltiples; mandamos
    // un solo archivo, así que nos quedamos con el primero.
    const [uploaded] = body.data ?? [];

    if (!uploaded) {
      throw new DocumentIngestionFailedError(
        'RAGFlow aceptó la subida pero no devolvió ningún documento',
      );
    }

    this.logger.log(
      `Documento subido a RAGFlow: ${uploaded.id} (dataset ${uploaded.dataset_id})`,
    );

    return { documentId: uploaded.id, datasetId: uploaded.dataset_id };
  }

  /**
   * Envuelve el `fetch` para que cualquier fallo de red o el timeout salgan
   * como error de dominio y no como un `TypeError` suelto.
   */
  private async post(url: string, form: FormData): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'POST',
        // Sin `Content-Type`: lo pone fetch con el boundary del multipart.
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (cause) {
      const reason =
        cause instanceof Error && cause.name === 'TimeoutError'
          ? `no respondió en ${this.config.timeoutMs} ms`
          : 'no se pudo contactar el servicio';

      throw new DocumentIngestionFailedError(reason, { cause });
    }
  }
}
