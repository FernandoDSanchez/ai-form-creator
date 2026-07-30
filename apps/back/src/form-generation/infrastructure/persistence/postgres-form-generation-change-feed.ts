import { formGenerationChangeChannel } from '@ai-form-creator/contracts/form-generation/form-generation-event';
import { formGenerationStatuses } from '@ai-form-creator/contracts/form-generation/form-generation-status';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Client } from 'pg';
import { z } from 'zod';

import { changeFeedConfig } from '../../../config/app-config';
import { env } from '../../../config/env';
import type {
  FormGenerationChange,
  FormGenerationChangeFeed,
} from '../../domain/ports/form-generation-change-feed.port';

/**
 * Forma del payload que manda el trigger de la migración.
 *
 * Se valida aunque lo escribamos nosotros: el productor está en un `.sql` que
 * ni ESLint ni `tsc` miran, y llega por un canal sin tipos. Si alguien edita el
 * `json_build_object` sin actualizar esto, lo que se ve es un log claro y no un
 * `undefined` recorriendo tres capas hasta el front.
 */
const changePayloadSchema = z.object({
  id: z.uuid(),
  status: z.enum(Object.values(formGenerationStatuses)),
});

/**
 * Escucha `LISTEN form_generation_changed` con el driver `pg` crudo.
 *
 * Prisma no expone `LISTEN` —su protocolo es petición/respuesta y las
 * notificaciones asíncronas no tienen dónde entrar—, así que este adaptador
 * abre su propia conexión. Es la única del back que no pasa por Prisma, y es a
 * propósito: son responsabilidades distintas (consultas vs. una sesión
 * permanente parada en un socket).
 *
 * Un `Client` y no un `Pool`: `LISTEN` se registra **por sesión**. Si esto
 * saliera de un pool, la suscripción viviría en la conexión que a esa llamada
 * le tocó y se perdería en cuanto el pool la reciclara — funcionando en
 * desarrollo y muriendo callado en producción.
 *
 * Con varias réplicas del back, Postgres entrega el `NOTIFY` a **todas** las
 * que estén escuchando. Eso no es un problema sino justo lo que hace falta:
 * cada réplica tiene sus propios clientes de socket.io conectados, y cada una
 * le avisa a los suyos.
 */
@Injectable()
export class PostgresFormGenerationChangeFeed
  implements FormGenerationChangeFeed, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PostgresFormGenerationChangeFeed.name);
  private readonly listeners = new Set<
    (change: FormGenerationChange) => void
  >();

  private client: Client | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  onChange(listener: (change: FormGenerationChange) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    await this.closeClient();
  }

  private async connect(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    const client = new Client({ connectionString: env.DATABASE_URL });
    this.client = client;

    // Un error en una conexión ociosa llega por este evento, no por un throw.
    // Sin el handler, `pg` lo emite como 'error' sin escuchar y Node tumba el
    // proceso entero.
    client.on('error', (error) => {
      this.logger.error(`Se cortó la escucha de Postgres: ${error.message}`);
      this.scheduleReconnect();
    });

    client.on('notification', (notification) => {
      this.handleNotification(notification.payload);
    });

    try {
      await client.connect();
      // Sin comillas y en minúsculas: el nombre del canal es un identificador,
      // y así coincide con el literal que usa `pg_notify` en el trigger.
      await client.query(`LISTEN ${formGenerationChangeChannel}`);
      this.logger.log(`Escuchando ${formGenerationChangeChannel}`);
    } catch (error) {
      this.logger.error(
        `No se pudo abrir la escucha: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.scheduleReconnect();
    }
  }

  /**
   * Reintenta para siempre. Un back que dejó de escuchar sigue pasando las
   * probes y sirviendo HTTP: la falla no se ve por ningún lado salvo porque el
   * front se queda sin novedades. Es preferible reintentar en loop y dejarlo
   * anotado en el log.
   */
  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.closeClient().then(() => this.connect());
    }, changeFeedConfig.reconnectDelayMs);
  }

  private async closeClient(): Promise<void> {
    const client = this.client;
    this.client = null;

    if (!client) {
      return;
    }

    try {
      await client.end();
    } catch {
      // Cerrar una conexión ya rota tira; no hay nada que hacer al respecto.
    }
  }

  private handleNotification(payload: string | undefined): void {
    if (!payload) {
      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(payload);
    } catch {
      this.logger.warn(`Aviso con payload no-JSON: ${payload}`);
      return;
    }

    const result = changePayloadSchema.safeParse(parsed);

    if (!result.success) {
      this.logger.warn(`Aviso con forma inesperada: ${payload}`);
      return;
    }

    const change: FormGenerationChange = {
      formGenerationId: result.data.id,
      status: result.data.status,
    };

    for (const listener of this.listeners) {
      listener(change);
    }
  }
}
