import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type { RegulatoryDocumentRepository } from '../../domain/ports/regulatory-document-repository.port';
import type {
  NewRegulatoryDocument,
  RegulatoryDocument,
} from '../../domain/regulatory-document';

import { toRegulatoryDocument } from './regulatory-document.mapper';

/** Adaptador de salida: implementa el puerto del repositorio sobre Postgres. */
@Injectable()
export class PrismaRegulatoryDocumentRepository implements RegulatoryDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(document: NewRegulatoryDocument): Promise<RegulatoryDocument> {
    const row = await this.prisma.regulatoryDocument.create({
      data: {
        ragflowDocumentId: document.ragflowDocumentId,
        ragflowDatasetId: document.ragflowDatasetId,
        fileName: document.fileName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        status: document.status,
      },
    });

    return toRegulatoryDocument(row);
  }
}
