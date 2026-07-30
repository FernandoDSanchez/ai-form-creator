import { Module } from '@nestjs/common';

import { httpConfig } from '../config/app-config';
import { env } from '../config/env';

import { ListRegulatoryDocumentsUseCase } from './application/list-regulatory-documents.use-case';
import { RegisterRegulatoryDocumentUseCase } from './application/register-regulatory-document.use-case';
import {
  DOCUMENT_INGESTION,
  type DocumentIngestion,
} from './domain/ports/document-ingestion.port';
import {
  DOCUMENT_PROCESSING_LAUNCHER,
  type DocumentProcessingLauncher,
} from './domain/ports/document-processing-launcher.port';
import {
  REGULATORY_DOCUMENT_REPOSITORY,
  type RegulatoryDocumentRepository,
} from './domain/ports/regulatory-document-repository.port';
import { RegulatoryDocumentsController } from './infrastructure/http/regulatory-documents.controller';
import { PrismaRegulatoryDocumentRepository } from './infrastructure/persistence/prisma-regulatory-document.repository';
import { DeferredDocumentProcessingLauncher } from './infrastructure/processing/deferred-document-processing-launcher';
import { RagflowDocumentIngestionAdapter } from './infrastructure/ragflow/ragflow-document-ingestion.adapter';

/**
 * The only place where it is decided which adapter covers each port.
 *
 * Switching ingestion engines, databases, or wiring Temporal in is editing one
 * line here. Nothing else in the module finds out.
 */
@Module({
  controllers: [RegulatoryDocumentsController],
  providers: [
    // --- port → adapter ---
    {
      provide: REGULATORY_DOCUMENT_REPOSITORY,
      useClass: PrismaRegulatoryDocumentRepository,
    },
    {
      provide: DOCUMENT_INGESTION,
      useFactory: (): DocumentIngestion =>
        new RagflowDocumentIngestionAdapter({
          apiUrl: env.RAGFLOW_API_URL,
          apiKey: env.RAGFLOW_API_KEY,
          datasetId: env.RAGFLOW_DATASET_ID,
          timeoutMs: httpConfig.ragflowTimeoutMs,
        }),
    },
    {
      // TODO(temporal): replace with TemporalDocumentProcessingLauncher.
      provide: DOCUMENT_PROCESSING_LAUNCHER,
      useClass: DeferredDocumentProcessingLauncher,
    },

    // --- use case ---
    // `useFactory` instead of `@Injectable()`: this way the application class
    // does not import Nest and its unit test needs no DI container.
    {
      provide: RegisterRegulatoryDocumentUseCase,
      useFactory: (
        documents: RegulatoryDocumentRepository,
        ingestion: DocumentIngestion,
        processing: DocumentProcessingLauncher,
      ) =>
        new RegisterRegulatoryDocumentUseCase(documents, ingestion, processing),
      inject: [
        REGULATORY_DOCUMENT_REPOSITORY,
        DOCUMENT_INGESTION,
        DOCUMENT_PROCESSING_LAUNCHER,
      ],
    },
    {
      provide: ListRegulatoryDocumentsUseCase,
      useFactory: (documents: RegulatoryDocumentRepository) =>
        new ListRegulatoryDocumentsUseCase(documents),
      inject: [REGULATORY_DOCUMENT_REPOSITORY],
    },
  ],
})
export class RegulatoryDocumentsModule {}
