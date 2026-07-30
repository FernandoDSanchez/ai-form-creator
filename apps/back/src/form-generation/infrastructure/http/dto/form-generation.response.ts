import { formGenerationStatuses } from '@ai-form-creator/contracts/form-generation/form-generation-status';
import type { FormilyFormSchema } from '@ai-form-creator/contracts/form-generation/formily-form-schema';
import type { GeneratedForm } from '@ai-form-creator/contracts/form-generation/generated-form';
import { ApiProperty } from '@nestjs/swagger';

import type { FormGeneration } from '../../../domain/form-generation';

/**
 * Vista HTTP de la entidad.
 *
 * Acá coincide campo a campo con el dominio —la entidad *es* el contrato
 * compartido—, así que el `from` parece de más. No lo es: el día que la tabla
 * gane una columna interna, esta clase es la que decide si sale o no. Sin ella,
 * la columna nueva viaja al front el mismo día que se agrega, sin que nadie lo
 * haya decidido.
 *
 * La usa también el gateway de WebSocket: el evento publica exactamente lo
 * mismo que devuelve el GET. Si divergieran, el front tendría que manejar dos
 * formas del mismo objeto según de dónde vino.
 */
export class FormGenerationResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'El pedido en lenguaje natural.' })
  prompt!: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Documentos regulatorios elegidos al hacer el pedido.',
  })
  regulatoryDocumentIds!: string[];

  @ApiProperty({ enum: Object.values(formGenerationStatuses) })
  status!: string;

  @ApiProperty({ description: 'Intentos consumidos contra el modelo.' })
  attempts!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Borrador validado que devolvió el modelo.',
  })
  draft!: GeneratedForm | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Schema de Formily listo para renderizar.',
  })
  formilySchema!: FormilyFormSchema | null;

  @ApiProperty({ nullable: true })
  failureReason!: string | null;

  @ApiProperty({ nullable: true })
  reviewerNote!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  static from(formGeneration: FormGeneration): FormGenerationResponse {
    return {
      id: formGeneration.id,
      prompt: formGeneration.prompt,
      regulatoryDocumentIds: formGeneration.regulatoryDocumentIds,
      status: formGeneration.status,
      attempts: formGeneration.attempts,
      draft: formGeneration.draft,
      formilySchema: formGeneration.formilySchema,
      failureReason: formGeneration.failureReason,
      reviewerNote: formGeneration.reviewerNote,
      // Ya vienen como string ISO desde el mapper de Prisma: la entidad es el
      // contrato compartido con el front y no maneja `Date`.
      reviewedAt: formGeneration.reviewedAt,
      createdAt: formGeneration.createdAt,
      updatedAt: formGeneration.updatedAt,
    };
  }
}
