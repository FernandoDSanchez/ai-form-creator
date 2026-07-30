import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';

import { BroadcastFormGenerationChangesUseCase } from '../../application/broadcast-form-generation-changes.use-case';

/**
 * All this file does is press the start button of the use case joining the
 * change feed with the gateway.
 *
 * It exists because the use case cannot do it on its own: it does not know
 * Nest, so it has no way of finding out when the app finished booting. That
 * knowledge is infrastructure, and it lives here.
 *
 * `OnApplicationBootstrap` and not `OnModuleInit`: the latter runs while the
 * modules are still initialising, and the socket.io gateway might not have a
 * server assigned. The former runs once everything is up.
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
    this.logger.log('Publishing generation changes over WebSocket');
  }

  onApplicationShutdown(): void {
    this.broadcastChanges.stop();
  }
}
