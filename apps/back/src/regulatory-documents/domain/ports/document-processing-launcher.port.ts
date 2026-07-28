/**
 * Puerto de salida para arrancar el procesamiento asíncrono de un documento.
 *
 * Recibe SÓLO el id: el workflow lee de Postgres lo que necesite. Así el
 * payload del workflow no queda acoplado a la forma de la entidad.
 *
 * Adaptador actual: `infrastructure/processing/deferred-document-processing-launcher.ts`
 * (deja constancia y no hace nada más). Cuando exista la capa de Temporal, se
 * reemplaza por un adaptador que haga `workflow.start('ProcessRagDoc', …)`
 * sin tocar ni el dominio ni el caso de uso.
 */
export type DocumentProcessingLauncher = {
  launch(regulatoryDocumentId: string): Promise<void>;
};

export const DOCUMENT_PROCESSING_LAUNCHER = Symbol(
  'DocumentProcessingLauncher',
);
