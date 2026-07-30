import { ApiProperty } from '@nestjs/swagger';

/**
 * It only exists so Swagger draws the file picker in `/docs`. The real
 * validation (type and size) is done by the controller's `ParseFilePipe`, not
 * by `class-validator`: the file is not a JSON field.
 */
export class UploadRegulatoryDocumentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Regulatory document as a PDF.',
  })
  file!: Express.Multer.File;
}
