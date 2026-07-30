import { formGenerationStatuses } from '@ai-form-creator/contracts/form-generation/form-generation-status';
import type { FormilyFormSchema } from '@ai-form-creator/contracts/form-generation/formily-form-schema';
import type { GeneratedForm } from '@ai-form-creator/contracts/form-generation/generated-form';
import { ApiProperty } from '@nestjs/swagger';

import type { FormGeneration } from '../../../domain/form-generation';

/**
 * HTTP view of the entity.
 *
 * Here it matches the domain field by field — the entity *is* the shared
 * contract — so the `from` looks superfluous. It is not: the day the table
 * gains an internal column, this class is the one deciding whether it goes out
 * or not. Without it, the new column travels to the front the same day it is
 * added, without anybody having decided so.
 *
 * The WebSocket gateway uses it too: the event publishes exactly the same thing
 * the GET returns. If they diverged, the front would have to handle two shapes
 * of the same object depending on where it came from.
 */
export class FormGenerationResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'The natural language request.' })
  prompt!: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Regulatory documents chosen when making the request.',
  })
  regulatoryDocumentIds!: string[];

  @ApiProperty({ enum: Object.values(formGenerationStatuses) })
  status!: string;

  @ApiProperty({ description: 'Attempts spent against the model.' })
  attempts!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Validated draft returned by the model.',
  })
  draft!: GeneratedForm | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Formily schema ready to render.',
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
      // They already arrive as ISO strings from the Prisma mapper: the entity
      // is the contract shared with the front and does not handle `Date`.
      reviewedAt: formGeneration.reviewedAt,
      createdAt: formGeneration.createdAt,
      updatedAt: formGeneration.updatedAt,
    };
  }
}
