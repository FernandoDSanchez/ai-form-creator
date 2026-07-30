import {
  Controller,
  FileTypeValidator,
  Get,
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
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { uploadConfig } from '../../../config/app-config';
import { ListRegulatoryDocumentsUseCase } from '../../application/list-regulatory-documents.use-case';
import { RegisterRegulatoryDocumentUseCase } from '../../application/register-regulatory-document.use-case';

import { DomainExceptionFilter } from './domain-exception.filter';
import { RegulatoryDocumentResponse } from './dto/regulatory-document.response';
import { UploadRegulatoryDocumentDto } from './dto/upload-regulatory-document.dto';

/**
 * Inbound adapter. Its only responsibility is translating HTTP ↔ domain: it
 * pulls the buffer out of the multipart, calls the use case and returns 202. No
 * business rule lives here.
 */
@ApiTags('regulatory-documents')
@Controller('regulatory-documents')
@UseFilters(DomainExceptionFilter)
export class RegulatoryDocumentsController {
  constructor(
    private readonly registerRegulatoryDocument: RegisterRegulatoryDocumentUseCase,
    private readonly listRegulatoryDocuments: ListRegulatoryDocumentsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lists the regulatory documents',
    description:
      'From the most recent to the oldest. Consumed by the document picker ' +
      'of the generation screen.',
  })
  @ApiOkResponse({ type: [RegulatoryDocumentResponse] })
  async list(): Promise<RegulatoryDocumentResponse[]> {
    const documents = await this.listRegulatoryDocuments.execute();

    return documents.map((document) =>
      RegulatoryDocumentResponse.from(document),
    );
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor(uploadConfig.fieldName, {
      // In memory: the container runs with `readOnlyRootFilesystem`.
      storage: memoryStorage(),
      limits: { fileSize: uploadConfig.maxFileSizeBytes, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadRegulatoryDocumentDto })
  @ApiOperation({
    summary: 'Registers a regulatory document',
    description:
      'Synchronous phase: uploads the PDF to RAGFlow, stores the row as ' +
      'PENDING and triggers the asynchronous processing. It answers without ' +
      'waiting for the pipeline.',
  })
  @ApiAcceptedResponse({
    description: 'Document accepted; processing continues in the background.',
    type: RegulatoryDocumentResponse,
  })
  @ApiBadRequestResponse({
    description: 'The file is missing or is not a PDF.',
  })
  @ApiPayloadTooLargeResponse({ description: 'The file exceeds the limit.' })
  @ApiBadGatewayResponse({
    description: 'RAGFlow rejected the upload or did not answer.',
  })
  async upload(
    @UploadedFileParam(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({
            maxSize: uploadConfig.maxFileSizeBytes,
          }),
          // Validates the magic numbers of the buffer, not the `Content-Type`
          // the client sends: an `.exe` renamed to `.pdf` is rejected here.
          new FileTypeValidator({
            fileType: uploadConfig.allowedMimeType,
            errorMessage: 'The file must be a PDF.',
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
