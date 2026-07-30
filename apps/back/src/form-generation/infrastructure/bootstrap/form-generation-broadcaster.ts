import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';

import { BroadcastFormGenerationChangesUseCase } from '../../application/broadcast-form-generation-changes.use-case';

/**
 * Lo único que hace este archivo es apretar el botón de arranque del caso de
 * uso que une el change feed con el gateway.
 *
 * Existe porque el caso de uso no puede hacerlo solo: no conoce Nest, así que
 * no tiene forma de enterarse de cuándo la app terminó de levantar. Ese
 * conocimiento es infraestructura, y vive acá.
 *
 * `OnApplicationBootstrap` y no `OnModuleInit`: el segundo corre mientras los
 * módulos todavía se están inicializando, y el gateway de socket.io podría no
 * tener servidor asignado. El primero corre cuando ya está todo en pie.
 */
@Injectable()
export class FormGenerationBroadcaster
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(FormGenerationBroadcaster.name);

  constructor(
    @Inject(BroadcastFormGenerationChangesUseCase)
    private readonly broadcastChanges: BroadcastFormGenerationChangesUseCase,
  ) {}

  onApplicationBootstrap(): void {
    this.broadcastChanges.start();
    this.logger.log('Publicando cambios de generación por WebSocket');
  }

  onApplicationShutdown(): void {
    this.broadcastChanges.stop();
  }
}
