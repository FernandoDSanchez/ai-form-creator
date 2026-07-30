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
 * Shape of the payload the migration trigger sends.
 *
 * It is validated even though we write it ourselves: the producer lives in a
 * `.sql` file that neither ESLint nor `tsc` look at, and it arrives through an
 * untyped channel. If somebody edits the `json_build_object` without updating
 * this, what shows up is a clear log line and not an `undefined` travelling
 * across three layers up to the front.
 */
const changePayloadSchema = z.object({
  id: z.uuid(),
  status: z.enum(Object.values(formGenerationStatuses)),
});

/**
 * Listens to `LISTEN form_generation_changed` with the raw `pg` driver.
 *
 * Prisma does not expose `LISTEN` — its protocol is request/response and
 * asynchronous notifications have nowhere to land — so this adapter opens its
 * own connection. It is the only one in the back not going through Prisma, and
 * that is on purpose: they are different responsibilities (queries vs. a
 * permanent session parked on a socket).
 *
 * A `Client` and not a `Pool`: `LISTEN` is registered **per session**. If this
 * came out of a pool, the subscription would live in whichever connection that
 * call happened to get and would be lost as soon as the pool recycled it —
 * working in development and dying quietly in production.
 *
 * With several back replicas, Postgres delivers the `NOTIFY` to **all** of
 * those listening. That is not a problem but exactly what is needed: each
 * replica has its own socket.io clients connected, and each one notifies its
 * own.
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

    // An error on an idle connection arrives through this event, not through a
    // throw. Without the handler, `pg` emits it as 'error' with nobody
    // listening and Node takes the whole process down.
    client.on('error', (error) => {
      this.logger.error(`The Postgres listener dropped: ${error.message}`);
      this.scheduleReconnect();
    });

    client.on('notification', (notification) => {
      this.handleNotification(notification.payload);
    });

    try {
      await client.connect();
      // Unquoted and lower case: the channel name is an identifier, and this
      // way it matches the literal `pg_notify` uses in the trigger.
      await client.query(`LISTEN ${formGenerationChangeChannel}`);
      this.logger.log(`Listening to ${formGenerationChangeChannel}`);
    } catch (error) {
      this.logger.error(
        `Could not open the listener: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.scheduleReconnect();
    }
  }

  /**
   * Retries forever. A back that stopped listening keeps passing the probes and
   * serving HTTP: the failure is invisible anywhere except in the front running
   * out of news. Retrying in a loop and writing it down in the log is
   * preferable.
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
      // Closing an already broken connection throws; there is nothing to do
      // about it.
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
      this.logger.warn(`Notification with a non-JSON payload: ${payload}`);
      return;
    }

    const result = changePayloadSchema.safeParse(parsed);

    if (!result.success) {
      this.logger.warn(`Notification with an unexpected shape: ${payload}`);
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
