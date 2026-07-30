import {
  formGenerationEvents,
  formGenerationNamespace,
  formGenerationRoom,
  formGenerationStreamPath,
} from '@ai-form-creator/contracts/form-generation/form-generation-event';
import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';

import { appConfig } from '../../../config/app-config';
import type { FormGeneration } from '../../domain/form-generation';
import type { FormGenerationPublisher } from '../../domain/ports/form-generation-publisher.port';
import { FormGenerationResponse } from '../http/dto/form-generation.response';

/** What the client sends when subscribing. It comes from outside: validate it. */
const watchPayloadSchema = z.uuid();

/**
 * Outbound adapter: publishes the changes over socket.io.
 *
 * One room per request, and the client explicitly asks which one it wants to
 * watch. The alternative — a broadcast to everyone connected — would send each
 * person's form to everybody else.
 *
 * The id is validated before creating the room. It is not type paranoia:
 * `join()` creates the room if it does not exist, so without the check any
 * client can grow the server's room map by sending garbage, and the room names
 * we emit ourselves (`form-generation:<uuid>`) stop being a closed space.
 *
 * The `path` is assembled with the global prefix by hand because
 * `setGlobalPrefix` only touches HTTP routes: a gateway hangs off the domain
 * root. In the cluster that would leave it outside the Ingress rule sending
 * `/api` to the back, and the handshake would end up in the front's nginx. See
 * the contract.
 */
@Injectable()
@WebSocketGateway({
  namespace: formGenerationNamespace,
  path: `/${appConfig.globalPrefix}${formGenerationStreamPath}`,
  // The front runs on another origin (app.<host> vs api.<host>), same as in the
  // `enableCors()` of `main.ts`. socket.io has its own CORS: the HTTP server's
  // does not cover it.
  cors: { origin: true, credentials: true },
})
export class FormGenerationsGateway implements FormGenerationPublisher {
  private readonly logger = new Logger(FormGenerationsGateway.name);

  @WebSocketServer()
  private readonly server?: Server;

  @SubscribeMessage(formGenerationEvents.watch)
  handleWatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): void {
    const parsed = watchPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      this.logger.warn(`Subscription with an invalid id: ${String(payload)}`);
      return;
    }

    void client.join(formGenerationRoom(parsed.data));
  }

  publish(formGeneration: FormGeneration): void {
    // There may be no server if something publishes before socket.io is up. It
    // is not an error: the status is in the database and the front fetches it
    // with a GET.
    this.server
      ?.to(formGenerationRoom(formGeneration.id))
      .emit(
        formGenerationEvents.changed,
        FormGenerationResponse.from(formGeneration),
      );
  }
}
