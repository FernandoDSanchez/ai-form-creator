import { Logger, Module } from '@nestjs/common';

import { BroadcastFormGenerationChangesUseCase } from './application/broadcast-form-generation-changes.use-case';
import { GetFormGenerationUseCase } from './application/get-form-generation.use-case';
import { ListFormGenerationsUseCase } from './application/list-form-generations.use-case';
import { RequestFormGenerationUseCase } from './application/request-form-generation.use-case';
import { ReviewFormGenerationUseCase } from './application/review-form-generation.use-case';
import {
  FORM_GENERATION_CHANGE_FEED,
  type FormGenerationChangeFeed,
} from './domain/ports/form-generation-change-feed.port';
import {
  FORM_GENERATION_ORCHESTRATOR,
  type FormGenerationOrchestrator,
} from './domain/ports/form-generation-orchestrator.port';
import {
  FORM_GENERATION_PUBLISHER,
  type FormGenerationPublisher,
} from './domain/ports/form-generation-publisher.port';
import {
  FORM_GENERATION_REPOSITORY,
  type FormGenerationRepository,
} from './domain/ports/form-generation-repository.port';
import {
  REGULATORY_DOCUMENT_CATALOG,
  type RegulatoryDocumentCatalog,
} from './domain/ports/regulatory-document-catalog.port';
import { FormGenerationBroadcaster } from './infrastructure/bootstrap/form-generation-broadcaster';
import { FormGenerationsController } from './infrastructure/http/form-generations.controller';
import { PostgresFormGenerationChangeFeed } from './infrastructure/persistence/postgres-form-generation-change-feed';
import { PrismaFormGenerationRepository } from './infrastructure/persistence/prisma-form-generation.repository';
import { PrismaRegulatoryDocumentCatalog } from './infrastructure/persistence/prisma-regulatory-document-catalog';
import { TemporalFormGenerationOrchestrator } from './infrastructure/temporal/temporal-form-generation-orchestrator';
import { FormGenerationsGateway } from './infrastructure/websocket/form-generations.gateway';

/**
 * The only place where it is decided which adapter covers each port.
 *
 * Swapping Temporal for another orchestrator, or the Postgres `LISTEN` for a
 * queue, is editing one line here. Nothing in the core finds out.
 *
 * The three adapters with a lifecycle (the feed, the orchestrator and the
 * gateway) are registered **twice**: as a class, so Nest runs their hooks
 * (`onModuleInit`, `onModuleDestroy`), and as `useExisting` under their token,
 * so the use cases receive them through the port. Without the pair, either the
 * hooks do not run or there are two different instances of the same adapter —
 * and the second version is worse, because the gateway doing the publishing
 * would not be the one holding the socket.io server.
 */
@Module({
  controllers: [FormGenerationsController],
  providers: [
    // --- adapters with a lifecycle ---
    PostgresFormGenerationChangeFeed,
    TemporalFormGenerationOrchestrator,
    FormGenerationsGateway,

    // --- port → adapter ---
    {
      provide: FORM_GENERATION_REPOSITORY,
      useClass: PrismaFormGenerationRepository,
    },
    {
      provide: REGULATORY_DOCUMENT_CATALOG,
      useClass: PrismaRegulatoryDocumentCatalog,
    },
    {
      provide: FORM_GENERATION_ORCHESTRATOR,
      useExisting: TemporalFormGenerationOrchestrator,
    },
    {
      provide: FORM_GENERATION_CHANGE_FEED,
      useExisting: PostgresFormGenerationChangeFeed,
    },
    {
      provide: FORM_GENERATION_PUBLISHER,
      useExisting: FormGenerationsGateway,
    },

    // --- use cases ---
    // `useFactory` instead of `@Injectable()`: this way the application classes
    // do not import Nest and their tests are written with doubles, with no DI
    // container.
    {
      provide: RequestFormGenerationUseCase,
      useFactory: (
        formGenerations: FormGenerationRepository,
        regulatoryDocuments: RegulatoryDocumentCatalog,
        orchestrator: FormGenerationOrchestrator,
      ) =>
        new RequestFormGenerationUseCase(
          formGenerations,
          regulatoryDocuments,
          orchestrator,
        ),
      inject: [
        FORM_GENERATION_REPOSITORY,
        REGULATORY_DOCUMENT_CATALOG,
        FORM_GENERATION_ORCHESTRATOR,
      ],
    },
    {
      provide: GetFormGenerationUseCase,
      useFactory: (formGenerations: FormGenerationRepository) =>
        new GetFormGenerationUseCase(formGenerations),
      inject: [FORM_GENERATION_REPOSITORY],
    },
    {
      provide: ListFormGenerationsUseCase,
      useFactory: (formGenerations: FormGenerationRepository) =>
        new ListFormGenerationsUseCase(formGenerations),
      inject: [FORM_GENERATION_REPOSITORY],
    },
    {
      provide: ReviewFormGenerationUseCase,
      useFactory: (
        formGenerations: FormGenerationRepository,
        orchestrator: FormGenerationOrchestrator,
      ) => new ReviewFormGenerationUseCase(formGenerations, orchestrator),
      inject: [FORM_GENERATION_REPOSITORY, FORM_GENERATION_ORCHESTRATOR],
    },
    {
      provide: BroadcastFormGenerationChangesUseCase,
      useFactory: (
        formGenerations: FormGenerationRepository,
        changeFeed: FormGenerationChangeFeed,
        publisher: FormGenerationPublisher,
      ) => {
        // The logger is injected as a function and not imported inside the use
        // case: `Logger` belongs to Nest, and the application does not know the
        // framework.
        const logger = new Logger(BroadcastFormGenerationChangesUseCase.name);

        return new BroadcastFormGenerationChangesUseCase(
          formGenerations,
          changeFeed,
          publisher,
          (error) =>
            logger.error(
              'Could not publish a change',
              error instanceof Error ? error.stack : String(error),
            ),
        );
      },
      inject: [
        FORM_GENERATION_REPOSITORY,
        FORM_GENERATION_CHANGE_FEED,
        FORM_GENERATION_PUBLISHER,
      ],
    },

    // --- bootstrap ---
    FormGenerationBroadcaster,
  ],
})
export class FormGenerationModule {}
