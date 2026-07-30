/**
 * No se pudo hablar con el orquestador (arrancar el workflow o mandarle la
 * señal de revisión).
 *
 * Es un fallo de un servicio de afuera, igual que
 * `DocumentIngestionFailedError`: se traduce a 502, no a 500. La solicitud pudo
 * haber quedado escrita en PENDING; lo que falló es el disparo.
 */
export class FormGenerationOrchestrationFailedError extends Error {
  constructor(
    readonly reason: string,
    options?: { cause?: unknown },
  ) {
    super(`No se pudo orquestar la generación: ${reason}`, {
      cause: options?.cause,
    });
    this.name = 'FormGenerationOrchestrationFailedError';
  }
}
