import { Injectable, Logger } from '@nestjs/common';

import type { DocumentProcessingLauncher } from '../../domain/ports/document-processing-launcher.port';

/**
 * Provisional adapter of the `DocumentProcessingLauncher` port.
 *
 * The Temporal layer does not exist yet: for now it only records that the
 * document is ready to be processed. The document stays in PENDING, which is
 * exactly what that status means, so nothing lies.
 *
 * Once Temporal is added, this file is replaced by a
 * `TemporalDocumentProcessingLauncher` doing
 *
 *   await client.workflow.start('ProcessRagDoc', {
 *     args: [regulatoryDocumentId],
 *     taskQueue: …,
 *     workflowId: `process-rag-doc-${regulatoryDocumentId}`,
 *   });
 *
 * and one line changes in `regulatory-documents.module.ts`. Neither the use
 * case nor the controller find out.
 */
@Injectable()
export class DeferredDocumentProcessingLauncher implements DocumentProcessingLauncher {
  private readonly logger = new Logger(DeferredDocumentProcessingLauncher.name);

  launch(regulatoryDocumentId: string): Promise<void> {
    this.logger.warn(
      `Document ${regulatoryDocumentId} in PENDING: no processing workflow ` +
        'is wired up yet (Temporal layer pending).',
    );

    return Promise.resolve();
  }
}
