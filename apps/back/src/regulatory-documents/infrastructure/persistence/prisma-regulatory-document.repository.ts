import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type { RegulatoryDocumentRepository } from '../../domain/ports/regulatory-document-repository.port';
import type {
  NewRegulatoryDocument,
  RegulatoryDocument,
} from '../../domain/regulatory-document';

import { toRegulatoryDocument } from './regulatory-document.mapper';

/** Outbound adapter: implements the repository port on top of Postgres. */
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

  async findAll(): Promise<RegulatoryDocument[]> {
    const rows = await this.prisma.regulatoryDocument.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(toRegulatoryDocument);
  }
}
