import { ApiProperty } from '@nestjs/swagger';

import type { RegulatoryDocument } from '../../../domain/regulatory-document';
import { regulatoryDocumentStatuses } from '../../../domain/regulatory-document-status';

/**
 * HTTP view of the entity. It is declared apart from the domain on purpose: the
 * contract with the front can change without dragging the core along, and a new
 * column does not leak into the response by itself.
 */
export class RegulatoryDocumentResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Document id on the RAGFlow side.' })
  ragflowDocumentId!: string;

  @ApiProperty({ description: 'RAGFlow dataset holding it.' })
  ragflowDatasetId!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({
    enum: Object.values(regulatoryDocumentStatuses),
    description:
      'Always PENDING in the registration response: processing is asynchronous.',
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
      // It already arrives as an ISO string from the Prisma mapper: the entity
      // is the contract shared with the front and does not handle `Date`.
      createdAt: document.createdAt,
    };
  }
}
