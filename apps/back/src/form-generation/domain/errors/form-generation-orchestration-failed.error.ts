/**
 * Could not talk to the orchestrator (starting the workflow or sending it the
 * review signal).
 *
 * It is a failure of an outside service, just like
 * `DocumentIngestionFailedError`: it translates into 502, not 500. The request
 * may already have been written as PENDING; what failed is the trigger.
 */
export class FormGenerationOrchestrationFailedError extends Error {
  constructor(
    readonly reason: string,
    options?: { cause?: unknown },
  ) {
    super(`Could not orchestrate the generation: ${reason}`, {
      cause: options?.cause,
    });
    this.name = 'FormGenerationOrchestrationFailedError';
  }
}
