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
 * Outbound adapter: uploads the file to RAGFlow, which persists it in its MinIO
 * and returns the `document_id`.
 *
 * The config arrives through the constructor (the module builds it from
 * `config/env.ts`) instead of importing `env` here: that way the test
 * instantiates the adapter with a fake URL without setting up the whole
 * environment.
 *
 * It uses Node's native `fetch` — axios is not needed for a single call.
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
        `RAGFlow answered HTTP ${response.status}`,
      );
    }

    const parsed = ragflowUploadResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new DocumentIngestionFailedError(
        'the RAGFlow response does not have the expected shape',
        { cause: parsed.error },
      );
    }

    const body = parsed.data;

    if (body.code !== RAGFLOW_SUCCESS_CODE) {
      throw new DocumentIngestionFailedError(
        body.message ?? `RAGFlow returned code ${body.code}`,
      );
    }

    // `data` is an array because the endpoint accepts multiple uploads; we send
    // a single file, so we keep the first one.
    const [uploaded] = body.data ?? [];

    if (!uploaded) {
      throw new DocumentIngestionFailedError(
        'RAGFlow accepted the upload but returned no document',
      );
    }

    this.logger.log(
      `Document uploaded to RAGFlow: ${uploaded.id} (dataset ${uploaded.dataset_id})`,
    );

    return { documentId: uploaded.id, datasetId: uploaded.dataset_id };
  }

  /**
   * Wraps the `fetch` so that any network failure or the timeout comes out as a
   * domain error and not as a loose `TypeError`.
   */
  private async post(url: string, form: FormData): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'POST',
        // No `Content-Type`: fetch sets it with the multipart boundary.
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (cause) {
      const reason =
        cause instanceof Error && cause.name === 'TimeoutError'
          ? `did not answer within ${this.config.timeoutMs} ms`
          : 'could not reach the service';

      throw new DocumentIngestionFailedError(reason, { cause });
    }
  }
}
