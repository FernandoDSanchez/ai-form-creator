import type { WorkflowRegulatoryDocument } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type { RegulatoryDocumentCatalog } from '../../domain/ports/regulatory-document-catalog.port';

/**
 * Outbound adapter of the document catalog.
 *
 * It reads the other bounded context's table. It is a three-column read and
 * nothing else — it does not write, it does not know the status of the
 * ingestion pipeline, and it imports not a single line from
 * `regulatory-documents/`. The coupling stays contained in this file, which is
 * exactly what the port is buying.
 *
 * An explicit `select` and not the whole row: if tomorrow the other context
 * adds a column, it does not leak by itself all the way to the workflow
 * payload.
 */
@Injectable()
export class PrismaRegulatoryDocumentCatalog implements RegulatoryDocumentCatalog {
  constructor(private readonly prisma: PrismaService) {}

  findByIds(
    regulatoryDocumentIds: readonly string[],
  ): Promise<WorkflowRegulatoryDocument[]> {
    return this.prisma.regulatoryDocument.findMany({
      where: { id: { in: [...regulatoryDocumentIds] } },
      select: { id: true, ragflowDocumentId: true, ragflowDatasetId: true },
    });
  }
}
