/**
 * El motor de ingesta rechazó el archivo o no respondió.
 *
 * Error de dominio, no `HttpException`: el núcleo no sabe qué código HTTP le
 * corresponde. Esa traducción la hace `infrastructure/http/domain-exception.filter.ts`.
 */
export class DocumentIngestionFailedError extends Error {
  constructor(
    readonly reason: string,
    options?: { cause?: unknown },
  ) {
    super(`No se pudo subir el documento al motor de ingesta: ${reason}`, {
      cause: options?.cause,
    });
    this.name = 'DocumentIngestionFailedError';
  }
}
