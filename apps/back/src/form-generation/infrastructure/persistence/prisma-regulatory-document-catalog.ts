import type { WorkflowRegulatoryDocument } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type { RegulatoryDocumentCatalog } from '../../domain/ports/regulatory-document-catalog.port';

/**
 * Adaptador de salida del catálogo de documentos.
 *
 * Lee la tabla del otro contexto acotado. Es una lectura de tres columnas y
 * nada más — ni escribe, ni conoce el estado del pipeline de ingesta, ni
 * importa una sola línea de `regulatory-documents/`. El acoplamiento queda
 * acotado a este archivo, que es exactamente lo que el puerto viene a comprar.
 *
 * `select` explícito y no la fila entera: si mañana el otro contexto le agrega
 * una columna, no se filtra sola hasta el payload del workflow.
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
