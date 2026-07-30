/**
 * Outbound port to kick off the asynchronous processing of a document.
 *
 * It receives ONLY the id: the workflow reads whatever it needs from Postgres.
 * That way the workflow payload does not get coupled to the shape of the
 * entity.
 *
 * Current adapter:
 * `infrastructure/processing/deferred-document-processing-launcher.ts` (it
 * leaves a trace and does nothing else). Once the Temporal layer exists, it is
 * replaced by an adapter doing `workflow.start('ProcessRagDoc', …)` without
 * touching either the domain or the use case.
 */
export type DocumentProcessingLauncher = {
  launch(regulatoryDocumentId: string): Promise<void>;
};

export const DOCUMENT_PROCESSING_LAUNCHER = Symbol(
  'DocumentProcessingLauncher',
);
