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
 * El único lugar donde se decide qué adaptador tapa cada puerto.
 *
 * Cambiar Temporal por otro orquestador, o el `LISTEN` de Postgres por una
 * cola, es editar una línea de acá. Nada del núcleo se entera.
 *
 * Los tres adaptadores con ciclo de vida (el feed, el orquestador y el gateway)
 * se registran **dos veces**: como clase, para que Nest les corra los hooks
 * (`onModuleInit`, `onModuleDestroy`), y como `useExisting` bajo su token, para
 * que los casos de uso los reciban por el puerto. Sin el par, o los hooks no
 * corren o hay dos instancias distintas del mismo adaptador — y la segunda
 * versión es peor, porque el gateway que publica no sería el que tiene el
 * servidor de socket.io.
 */
@Module({
  controllers: [FormGenerationsController],
  providers: [
    // --- adaptadores con ciclo de vida ---
    PostgresFormGenerationChangeFeed,
    TemporalFormGenerationOrchestrator,
    FormGenerationsGateway,

    // --- puerto → adaptador ---
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

    // --- casos de uso ---
    // `useFactory` en vez de `@Injectable()`: así las clases de aplicación no
    // importan Nest y sus tests se escriben con dobles, sin contenedor de DI.
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
        // El logger se inyecta como función y no se importa dentro del caso de
        // uso: `Logger` es de Nest, y la aplicación no conoce el framework.
        const logger = new Logger(BroadcastFormGenerationChangesUseCase.name);

        return new BroadcastFormGenerationChangesUseCase(
          formGenerations,
          changeFeed,
          publisher,
          (error) =>
            logger.error(
              'No se pudo publicar un cambio',
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

    // --- arranque ---
    FormGenerationBroadcaster,
  ],
})
export class FormGenerationModule {}
