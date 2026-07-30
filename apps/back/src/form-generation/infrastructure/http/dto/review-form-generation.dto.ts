import { formGenerationLimits } from '@ai-form-creator/contracts/form-generation/form-generation';
import {
  formGenerationReviewDecisions,
  type FormGenerationReviewDecision,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

/** Cuerpo del `POST /form-generations/:formGenerationId/review`. */
export class ReviewFormGenerationDto {
  @ApiProperty({
    enum: Object.values(formGenerationReviewDecisions),
    description: 'Aprobar publica el formulario; rechazar lo descarta.',
  })
  // `@IsIn` sobre los valores del contrato y no `@IsEnum` sobre un enum de
  // TypeScript: el vocabulario vive en el paquete compartido como objeto
  // `as const`, no como `enum` (`CLAUDE.md` §2).
  @IsIn(Object.values(formGenerationReviewDecisions))
  decision!: FormGenerationReviewDecision;

  @ApiProperty({
    maxLength: formGenerationLimits.reviewerNoteMaxLength,
    description: 'Por qué se aprueba o se rechaza. Puede ir vacío.',
    default: '',
  })
  @IsString()
  @MaxLength(formGenerationLimits.reviewerNoteMaxLength)
  reviewerNote!: string;
}
