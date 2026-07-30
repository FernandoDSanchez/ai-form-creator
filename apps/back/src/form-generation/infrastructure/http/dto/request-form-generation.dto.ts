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
 * Cuerpo del `POST /form-generations`.
 *
 * Los límites no se escriben acá: salen de `formGenerationLimits`, el mismo
 * objeto que restringe el `maxLength` del textarea del front y el `maxItems`
 * del schema. Los decoradores de `class-validator` son la forma que entiende el
 * `ValidationPipe` de Nest, pero los números son los del contrato — si mañana
 * el prompt puede ser más largo, se cambia en un lugar y las dos puntas se
 * enteran.
 */
export class RequestFormGenerationDto {
  @ApiProperty({
    description: 'Qué formulario se quiere, en lenguaje natural.',
    minLength: formGenerationLimits.promptMinLength,
    maxLength: formGenerationLimits.promptMaxLength,
    example:
      'Necesito el formulario de declaración de importación para mercancía ' +
      'sujeta a control sanitario.',
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
      'Documentos que le dan contexto al modelo. Puede ir vacío: sin ' +
      'documentos el formulario sale sólo del pedido y del vocabulario.',
    default: [],
  })
  @IsArray()
  @ArrayMaxSize(formGenerationLimits.maxRegulatoryDocuments)
  @IsUUID(undefined, { each: true })
  regulatoryDocumentIds!: string[];
}
