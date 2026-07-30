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

/** Lo que manda el cliente al suscribirse. Viene de afuera: se valida. */
const watchPayloadSchema = z.uuid();

/**
 * Adaptador de salida: publica los cambios por socket.io.
 *
 * Una sala por solicitud, y el cliente pide explícitamente cuál quiere mirar.
 * La alternativa —un broadcast a todos los conectados— mandaría el formulario
 * de cada uno a todos los demás.
 *
 * El id se valida antes de crear la sala. No es paranoia de tipos: `join()`
 * crea la sala si no existe, así que sin el chequeo cualquier cliente puede
 * hacer crecer el mapa de salas del servidor mandando basura, y los nombres de
 * sala que emitimos nosotros (`form-generation:<uuid>`) dejan de ser un espacio
 * cerrado.
 *
 * El `path` se arma con el prefijo global a mano porque `setGlobalPrefix` sólo
 * toca las rutas HTTP: un gateway queda colgando de la raíz del dominio. En el
 * cluster eso lo dejaría fuera de la regla de Ingress que manda `/api` al back,
 * y el handshake terminaría en el nginx del front. Ver el contrato.
 */
@Injectable()
@WebSocketGateway({
  namespace: formGenerationNamespace,
  path: `/${appConfig.globalPrefix}${formGenerationStreamPath}`,
  // El front corre en otro origen (app.<host> vs api.<host>), igual que en el
  // `enableCors()` de `main.ts`. socket.io tiene su propio CORS: el del
  // servidor HTTP no lo cubre.
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
      this.logger.warn(`Suscripción con id inválido: ${String(payload)}`);
      return;
    }

    void client.join(formGenerationRoom(parsed.data));
  }

  publish(formGeneration: FormGeneration): void {
    // Puede no haber servidor si algo publica antes de que socket.io levante.
    // No es un error: el estado está en la base y el front lo trae con un GET.
    this.server
      ?.to(formGenerationRoom(formGeneration.id))
      .emit(
        formGenerationEvents.changed,
        FormGenerationResponse.from(formGeneration),
      );
  }
}
