import {
  Controller,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile as UploadedFileParam,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiAcceptedResponse,
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { uploadConfig } from '../../../config/app-config';
import { RegisterRegulatoryDocumentUseCase } from '../../application/register-regulatory-document.use-case';

import { DomainExceptionFilter } from './domain-exception.filter';
import { RegulatoryDocumentResponse } from './dto/regulatory-document.response';
import { UploadRegulatoryDocumentDto } from './dto/upload-regulatory-document.dto';

/**
 * Adaptador de entrada. Su única responsabilidad es traducir HTTP ↔ dominio:
 * saca el buffer del multipart, llama al caso de uso y devuelve 202. Ninguna
 * regla de negocio vive acá.
 */
@ApiTags('regulatory-documents')
@Controller('regulatory-documents')
@UseFilters(DomainExceptionFilter)
export class RegulatoryDocumentsController {
  constructor(
    private readonly registerRegulatoryDocument: RegisterRegulatoryDocumentUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor(uploadConfig.fieldName, {
      // En memoria: el contenedor corre con `readOnlyRootFilesystem`.
      storage: memoryStorage(),
      limits: { fileSize: uploadConfig.maxFileSizeBytes, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadRegulatoryDocumentDto })
  @ApiOperation({
    summary: 'Registra un documento regulatorio',
    description:
      'Fase síncrona: sube el PDF a RAGFlow, guarda la fila en PENDING y ' +
      'dispara el procesamiento asíncrono. Responde sin esperar el pipeline.',
  })
  @ApiAcceptedResponse({
    description: 'Documento aceptado; el procesamiento sigue en segundo plano.',
    type: RegulatoryDocumentResponse,
  })
  @ApiBadRequestResponse({ description: 'Falta el archivo o no es un PDF.' })
  @ApiPayloadTooLargeResponse({ description: 'El archivo excede el límite.' })
  @ApiBadGatewayResponse({
    description: 'RAGFlow rechazó la subida o no respondió.',
  })
  async upload(
    @UploadedFileParam(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({
            maxSize: uploadConfig.maxFileSizeBytes,
          }),
          // Valida los magic numbers del buffer, no el `Content-Type` que
          // manda el cliente: un `.exe` renombrado a `.pdf` se rechaza acá.
          new FileTypeValidator({
            fileType: uploadConfig.allowedMimeType,
            errorMessage: 'El archivo debe ser un PDF.',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<RegulatoryDocumentResponse> {
    const document = await this.registerRegulatoryDocument.execute({
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      content: file.buffer,
    });

    return RegulatoryDocumentResponse.from(document);
  }
}
