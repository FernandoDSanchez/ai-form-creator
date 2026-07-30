import {
  formGenerationReviewDecisions,
  formGenerationStatuses,
  type FormGenerationReviewDecision,
  type FormGenerationStatus,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';
import type { FormilyFormSchema } from '@ai-form-creator/contracts/form-generation/formily-form-schema';
import type { GeneratedForm } from '@ai-form-creator/contracts/form-generation/generated-form';
import { Pool } from 'pg';

import { databaseConfig } from '../config/app-config';
import { env } from '../config/env';

/**
 * Escrituras del worker sobre `form_generations`.
 *
 * ┌─ El esquema NO se define acá ─────────────────────────────────────────────┐
 * │ La fuente de verdad es `apps/back/prisma/schema.prisma`, y las           │
 * │ migraciones las corre el back. Este archivo es el único del worker que    │
 * │ conoce nombres de tablas y columnas: si alguna cambia, cambia acá y en    │
 * │ ningún otro lado.                                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Por qué SQL a mano y no Prisma: el cliente de Prisma se genera dentro del
 * `node_modules` del paquete que tiene el `schema.prisma`, y no hay forma
 * limpia de que dos apps compartan uno sin duplicar el esquema o publicarlo
 * como paquete propio. Duplicarlo es peor que esto —dos esquemas que divergen
 * en silencio—, y publicarlo era rehacer el back entero. El worker escribe
 * cuatro sentencias; las cuatro están abajo, a la vista.
 *
 * El worker **sólo escribe**. Todo lo que necesita leer se lo pasa el back en
 * el argumento del workflow, justamente para que este archivo no crezca.
 */

const TABLE = 'form_generations';

/** Enum de Postgres que respalda la columna `status`. */
const STATUS_TYPE = 'FormGenerationStatus';

const columns = {
  id: 'id',
  status: 'status',
  attempts: 'attempts',
  draft: 'draft',
  formilySchema: 'formily_schema',
  failureReason: 'failure_reason',
  reviewerNote: 'reviewer_note',
  reviewedAt: 'reviewed_at',
  updatedAt: 'updated_at',
} as const;

/**
 * `updated_at` se escribe en cada sentencia, a mano.
 *
 * En el esquema es `@updatedAt`, que Prisma resuelve **en el cliente**: la
 * columna no tiene trigger ni default que la mantenga. Como el worker no pasa
 * por Prisma, si no la tocara acá se quedaría con la hora del alta mientras la
 * solicitud recorre todo el pipeline.
 */
const TOUCH_UPDATED_AT = `${columns.updatedAt} = now()`;

/** Veredicto humano → estado terminal. Un `Record`, no un `if` (§5). */
const statusByDecision: Record<
  FormGenerationReviewDecision,
  FormGenerationStatus
> = {
  [formGenerationReviewDecisions.approve]: formGenerationStatuses.approved,
  [formGenerationReviewDecisions.reject]: formGenerationStatuses.rejected,
};

export class FormGenerationStore {
  private readonly pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: databaseConfig.maxClients,
    idleTimeoutMillis: databaseConfig.idleTimeoutMs,
  });

  /**
   * Avance de estado. `attempts` sólo se toca si viene: hay cambios de estado
   * que no consumen un intento (RETRIEVING, VALIDATING).
   */
  async markStatus(
    formGenerationId: string,
    status: FormGenerationStatus,
    attempts?: number,
  ): Promise<void> {
    if (attempts === undefined) {
      await this.pool.query(
        `UPDATE ${TABLE}
            SET ${columns.status} = $2::"${STATUS_TYPE}", ${TOUCH_UPDATED_AT}
          WHERE ${columns.id} = $1::uuid`,
        [formGenerationId, status],
      );
      return;
    }

    await this.pool.query(
      `UPDATE ${TABLE}
          SET ${columns.status} = $2::"${STATUS_TYPE}",
              ${columns.attempts} = $3,
              ${TOUCH_UPDATED_AT}
        WHERE ${columns.id} = $1::uuid`,
      [formGenerationId, status, attempts],
    );
  }

  /**
   * Guarda el resultado y deja la solicitud esperando revisión.
   *
   * Una sola sentencia para las tres cosas: el borrador, el schema compilado y
   * el estado. Si fueran dos, existiría un instante con schema guardado y
   * estado viejo — y como el cambio de estado es lo que dispara el `NOTIFY`,
   * el front podría recibir el aviso antes de que el schema estuviera escrito.
   */
  async saveGeneratedForm(
    formGenerationId: string,
    draft: GeneratedForm,
    formilySchema: FormilyFormSchema,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE ${TABLE}
          SET ${columns.draft} = $2::jsonb,
              ${columns.formilySchema} = $3::jsonb,
              ${columns.status} = $4::"${STATUS_TYPE}",
              ${TOUCH_UPDATED_AT}
        WHERE ${columns.id} = $1::uuid`,
      [
        formGenerationId,
        JSON.stringify(draft),
        JSON.stringify(formilySchema),
        formGenerationStatuses.awaitingReview,
      ],
    );
  }

  async failFormGeneration(
    formGenerationId: string,
    reason: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE ${TABLE}
          SET ${columns.status} = $2::"${STATUS_TYPE}",
              ${columns.failureReason} = $3,
              ${TOUCH_UPDATED_AT}
        WHERE ${columns.id} = $1::uuid`,
      [formGenerationId, formGenerationStatuses.failed, reason],
    );
  }

  async applyReview(
    formGenerationId: string,
    decision: FormGenerationReviewDecision,
    reviewerNote: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE ${TABLE}
          SET ${columns.status} = $2::"${STATUS_TYPE}",
              ${columns.reviewerNote} = $3,
              ${columns.reviewedAt} = now(),
              ${TOUCH_UPDATED_AT}
        WHERE ${columns.id} = $1::uuid`,
      [formGenerationId, statusByDecision[decision], reviewerNote],
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
