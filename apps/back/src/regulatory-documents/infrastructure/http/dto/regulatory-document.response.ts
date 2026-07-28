import { ApiProperty } from '@nestjs/swagger';

import type { RegulatoryDocument } from '../../../domain/regulatory-document';
import { regulatoryDocumentStatuses } from '../../../domain/regulatory-document-status';

/**
 * Vista HTTP de la entidad. Se declara aparte del dominio a propósito: el
 * contrato con el front puede cambiar sin arrastrar al núcleo, y una columna
 * nueva no se filtra sola a la respuesta.
 */
export class RegulatoryDocumentResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Id del documento del lado de RAGFlow.' })
  ragflowDocumentId!: string;

  @ApiProperty({ description: 'Dataset de RAGFlow que lo contiene.' })
  ragflowDatasetId!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({
    enum: Object.values(regulatoryDocumentStatuses),
    description:
      'Siempre PENDING en la respuesta del alta: el procesamiento es asíncrono.',
  })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  static from(document: RegulatoryDocument): RegulatoryDocumentResponse {
    return {
      id: document.id,
      ragflowDocumentId: document.ragflowDocumentId,
      ragflowDatasetId: document.ragflowDatasetId,
      fileName: document.fileName,
      sizeBytes: document.sizeBytes,
      status: document.status,
      createdAt: document.createdAt.toISOString(),
    };
  }
}
