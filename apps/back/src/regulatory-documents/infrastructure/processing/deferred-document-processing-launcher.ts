import { Injectable, Logger } from '@nestjs/common';

import type { DocumentProcessingLauncher } from '../../domain/ports/document-processing-launcher.port';

/**
 * Adaptador provisorio del puerto `DocumentProcessingLauncher`.
 *
 * La capa de Temporal todavía no existe: por ahora sólo registra que el
 * documento quedó listo para procesarse. El documento queda en PENDING, que es
 * exactamente lo que significa ese estado, así que nada miente.
 *
 * Cuando se agregue Temporal, este archivo se reemplaza por un
 * `TemporalDocumentProcessingLauncher` que haga
 *
 *   await client.workflow.start('ProcessRagDoc', {
 *     args: [regulatoryDocumentId],
 *     taskQueue: …,
 *     workflowId: `process-rag-doc-${regulatoryDocumentId}`,
 *   });
 *
 * y se cambia una línea en `regulatory-documents.module.ts`. Ni el caso de uso
 * ni el controlador se enteran.
 */
@Injectable()
export class DeferredDocumentProcessingLauncher implements DocumentProcessingLauncher {
  private readonly logger = new Logger(DeferredDocumentProcessingLauncher.name);

  launch(regulatoryDocumentId: string): Promise<void> {
    this.logger.warn(
      `Documento ${regulatoryDocumentId} en PENDING: no hay workflow de ` +
        'procesamiento conectado todavía (capa de Temporal pendiente).',
    );

    return Promise.resolve();
  }
}
