import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import type {
  FormGeneration,
  NewFormGeneration,
} from '../../domain/form-generation';
import type { FormGenerationRepository } from '../../domain/ports/form-generation-repository.port';

import { toFormGeneration } from './form-generation.mapper';

/** Adaptador de salida: implementa el puerto del repositorio sobre Postgres. */
@Injectable()
export class PrismaFormGenerationRepository implements FormGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(request: NewFormGeneration): Promise<FormGeneration> {
    // `status` y `attempts` los pone el DEFAULT de la tabla: el estado inicial
    // es una decisión del esquema, no de cada `create` que alguien escriba.
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
