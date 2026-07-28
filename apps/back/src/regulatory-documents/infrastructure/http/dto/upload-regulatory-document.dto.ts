import { ApiProperty } from '@nestjs/swagger';

/**
 * Sólo existe para que Swagger dibuje el selector de archivo en `/docs`.
 * La validación real (tipo y tamaño) la hace el `ParseFilePipe` del
 * controlador, no `class-validator`: el archivo no es un campo JSON.
 */
export class UploadRegulatoryDocumentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Documento regulatorio en PDF.',
  })
  file!: Express.Multer.File;
}
