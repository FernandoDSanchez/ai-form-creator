import { formGenerationLimits } from '@ai-form-creator/contracts/form-generation/form-generation';
import {
  formGenerationReviewDecisions,
  type FormGenerationReviewDecision,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

/** Body of `POST /form-generations/:formGenerationId/review`. */
export class ReviewFormGenerationDto {
  @ApiProperty({
    enum: Object.values(formGenerationReviewDecisions),
    description: 'Approving publishes the form; rejecting discards it.',
  })
  // `@IsIn` over the contract values and not `@IsEnum` over a TypeScript enum:
  // the vocabulary lives in the shared package as an `as const` object, not as
  // an `enum` (`CLAUDE.md` §2).
  @IsIn(Object.values(formGenerationReviewDecisions))
  decision!: FormGenerationReviewDecision;

  @ApiProperty({
    maxLength: formGenerationLimits.reviewerNoteMaxLength,
    description: 'Why it is approved or rejected. It may be empty.',
    default: '',
  })
  @IsString()
  @MaxLength(formGenerationLimits.reviewerNoteMaxLength)
  reviewerNote!: string;
}
