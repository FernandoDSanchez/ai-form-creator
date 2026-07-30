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
 * El único lugar donde se decide qué adaptador tapa cada puerto.
 *
 * Cambiar de motor de ingesta, de base o conectar Temporal es editar una línea
 * de acá. Nada más del módulo se entera.
 */
@Module({
  controllers: [RegulatoryDocumentsController],
  providers: [
    // --- puerto → adaptador ---
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
      // TODO(temporal): reemplazar por TemporalDocumentProcessingLauncher.
      provide: DOCUMENT_PROCESSING_LAUNCHER,
      useClass: DeferredDocumentProcessingLauncher,
    },

    // --- caso de uso ---
    // `useFactory` en vez de `@Injectable()`: así la clase de aplicación no
    // importa Nest y su test unitario no necesita el contenedor de DI.
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
