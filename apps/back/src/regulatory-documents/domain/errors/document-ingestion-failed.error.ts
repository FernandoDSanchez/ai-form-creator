/**
 * The ingestion engine rejected the file or did not answer.
 *
 * A domain error, not an `HttpException`: the core does not know which HTTP
 * code corresponds to it. That translation is done by
 * `infrastructure/http/domain-exception.filter.ts`.
 */
export class DocumentIngestionFailedError extends Error {
  constructor(
    readonly reason: string,
    options?: { cause?: unknown },
  ) {
    super(`Could not upload the document to the ingestion engine: ${reason}`, {
      cause: options?.cause,
    });
    this.name = 'DocumentIngestionFailedError';
  }
}
