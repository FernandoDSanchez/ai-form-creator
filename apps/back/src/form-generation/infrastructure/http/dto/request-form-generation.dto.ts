import { formGenerationLimits } from '@ai-form-creator/contracts/form-generation/form-generation';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

/**
 * Body of `POST /form-generations`.
 *
 * The limits are not written here: they come from `formGenerationLimits`, the
 * same object constraining the `maxLength` of the front textarea and the
 * `maxItems` of the schema. The `class-validator` decorators are the shape
 * Nest's `ValidationPipe` understands, but the numbers are the contract's — if
 * tomorrow the prompt can be longer, it changes in one place and both ends find
 * out.
 */
export class RequestFormGenerationDto {
  @ApiProperty({
    description: 'Which form is wanted, in natural language.',
    minLength: formGenerationLimits.promptMinLength,
    maxLength: formGenerationLimits.promptMaxLength,
    example:
      'I need the import declaration form for goods subject to sanitary ' +
      'control.',
  })
  @IsString()
  @Length(
    formGenerationLimits.promptMinLength,
    formGenerationLimits.promptMaxLength,
  )
  prompt!: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    maxItems: formGenerationLimits.maxRegulatoryDocuments,
    description:
      'Documents giving the model context. It may be empty: with no ' +
      'documents the form comes only from the request and the vocabulary.',
    default: [],
  })
  @IsArray()
  @ArrayMaxSize(formGenerationLimits.maxRegulatoryDocuments)
  @IsUUID(undefined, { each: true })
  regulatoryDocumentIds!: string[];
}
