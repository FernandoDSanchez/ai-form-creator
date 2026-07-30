import type { FormGenerationReview } from '@ai-form-creator/contracts/form-generation/form-generation';
import {
  formGenerationSignals,
  formGenerationTaskQueue,
  formGenerationWorkflowId,
  generateFormWorkflowType,
  type GenerateFormWorkflowInput,
} from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Client, Connection } from '@temporalio/client';

import { temporalConfig } from '../../../config/app-config';
import { env } from '../../../config/env';
import { FormGenerationOrchestrationFailedError } from '../../domain/errors/form-generation-orchestration-failed.error';
import type { FormGenerationOrchestrator } from '../../domain/ports/form-generation-orchestrator.port';

/**
 * Outbound adapter: covers the orchestrator port with Temporal.
 *
 * Here the back is **only a client**. It registers neither workflows nor
 * activities: that lives in `apps/worker`, which is another process and another
 * image. All this file knows is how to enqueue and how to send a signal, and
 * the names of both come from the contracts package so they cannot diverge from
 * the worker.
 *
 * The connection is opened at boot but **its failure does not take the pod
 * down**, unlike Prisma's. Without a database there is nothing to do; without
 * Temporal the back still serves the GETs and the WebSockets, and what fails is
 * only the request. It is retried on every call.
 */
@Injectable()
export class TemporalFormGenerationOrchestrator
  implements FormGenerationOrchestrator, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TemporalFormGenerationOrchestrator.name);

  private connection: Connection | null = null;
  private client: Client | null = null;

  async onModuleInit(): Promise<void> {
    await this.tryConnect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection?.close();
    this.connection = null;
    this.client = null;
  }

  async start(input: GenerateFormWorkflowInput): Promise<void> {
    const client = await this.requireClient();

    try {
      await client.workflow.start(generateFormWorkflowType, {
        taskQueue: formGenerationTaskQueue,
        // Deterministic id derived from the row: no `runId` has to be stored to
        // signal it later. See the contract.
        workflowId: formGenerationWorkflowId(input.formGenerationId),
        args: [input],
      });
    } catch (cause) {
      throw new FormGenerationOrchestrationFailedError(
        `could not enqueue the workflow (${describe(cause)})`,
        { cause },
      );
    }
  }

  async submitReview(
    formGenerationId: string,
    review: FormGenerationReview,
  ): Promise<void> {
    const client = await this.requireClient();
    const handle = client.workflow.getHandle(
      formGenerationWorkflowId(formGenerationId),
    );

    try {
      await handle.signal(formGenerationSignals.review, review);
    } catch (cause) {
      // We land here if the workflow already finished (the review window
      // expired, for instance) or if Temporal is not answering. In both cases
      // the verdict was not applied, and the client has to find out.
      throw new FormGenerationOrchestrationFailedError(
        `could not deliver the verdict (${describe(cause)})`,
        { cause },
      );
    }
  }

  private async requireClient(): Promise<Client> {
    if (!this.client) {
      await this.tryConnect();
    }

    if (!this.client) {
      throw new FormGenerationOrchestrationFailedError(
        `there is no connection to Temporal at ${env.TEMPORAL_ADDRESS}`,
      );
    }

    return this.client;
  }

  private async tryConnect(): Promise<void> {
    try {
      this.connection = await Connection.connect({
        address: env.TEMPORAL_ADDRESS,
        connectTimeout: temporalConfig.connectTimeoutMs,
      });
      this.client = new Client({
        connection: this.connection,
        namespace: env.TEMPORAL_NAMESPACE,
      });
      this.logger.log(`Connected to Temporal at ${env.TEMPORAL_ADDRESS}`);
    } catch (error) {
      this.connection = null;
      this.client = null;
      this.logger.error(
        `Could not connect to Temporal at ${env.TEMPORAL_ADDRESS}: ${describe(error)}`,
      );
    }
  }
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
