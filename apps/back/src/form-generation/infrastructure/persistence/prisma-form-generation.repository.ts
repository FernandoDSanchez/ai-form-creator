import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type {
  FormGeneration,
  NewFormGeneration,
} from '../../domain/form-generation';
import type { FormGenerationRepository } from '../../domain/ports/form-generation-repository.port';

import { toFormGeneration } from './form-generation.mapper';

/** Outbound adapter: implements the repository port on top of Postgres. */
@Injectable()
export class PrismaFormGenerationRepository implements FormGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(request: NewFormGeneration): Promise<FormGeneration> {
    // `status` and `attempts` are set by the table DEFAULT: the initial status
    // is a decision of the schema, not of every `create` somebody writes.
    const row = await this.prisma.formGeneration.create({
      data: {
        prompt: request.prompt,
        regulatoryDocumentIds: request.regulatoryDocumentIds,
      },
    });

    return toFormGeneration(row);
  }

  async findById(formGenerationId: string): Promise<FormGeneration | null> {
    const row = await this.prisma.formGeneration.findUnique({
      where: { id: formGenerationId },
    });

    return row ? toFormGeneration(row) : null;
  }

  async findAll(): Promise<FormGeneration[]> {
    const rows = await this.prisma.formGeneration.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(toFormGeneration);
  }
}
