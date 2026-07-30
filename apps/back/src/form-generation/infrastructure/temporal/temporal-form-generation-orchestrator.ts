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
 * Adaptador de salida: tapa el puerto del orquestador con Temporal.
 *
 * El back es acá **sólo un cliente**. No registra workflows ni actividades: eso
 * vive en `apps/worker`, que es otro proceso y otra imagen. Lo único que este
 * archivo sabe es cómo encolar y cómo mandar una señal, y los nombres de las
 * dos cosas salen del paquete de contratos para que no puedan divergir del
 * worker.
 *
 * La conexión se abre en el arranque pero **su fallo no tumba el pod**, a
 * diferencia de la de Prisma. Sin base no hay nada que hacer; sin Temporal el
 * back todavía sirve los GET y los WebSocket, y lo que falla es sólo el alta.
 * Se reintenta en cada llamada.
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
        // Id determinista derivado de la fila: no hace falta guardar ningún
        // `runId` para mandarle la señal después. Ver el contrato.
        workflowId: formGenerationWorkflowId(input.formGenerationId),
        args: [input],
      });
    } catch (cause) {
      throw new FormGenerationOrchestrationFailedError(
        `no se pudo encolar el workflow (${describe(cause)})`,
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
      // Llega acá si el workflow ya terminó (por ejemplo, se venció la ventana
      // de revisión) o si Temporal no responde. En los dos casos el veredicto
      // no se aplicó, y el cliente tiene que enterarse.
      throw new FormGenerationOrchestrationFailedError(
        `no se pudo entregar el veredicto (${describe(cause)})`,
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
        `no hay conexión con Temporal en ${env.TEMPORAL_ADDRESS}`,
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
      this.logger.log(`Conectado a Temporal en ${env.TEMPORAL_ADDRESS}`);
    } catch (error) {
      this.connection = null;
      this.client = null;
      this.logger.error(
        `No se pudo conectar a Temporal en ${env.TEMPORAL_ADDRESS}: ${describe(error)}`,
      );
    }
  }
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
