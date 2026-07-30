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
 * The worker's writes over `form_generations`.
 *
 * ┌─ The schema is NOT defined here ──────────────────────────────────────────┐
 * │ The source of truth is `apps/back/prisma/schema.prisma`, and the          │
 * │ migrations are run by the back. This file is the only one in the worker   │
 * │ that knows table and column names: if one changes, it changes here and    │
 * │ nowhere else.                                                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Why hand-written SQL and not Prisma: the Prisma client is generated inside
 * the `node_modules` of the package holding the `schema.prisma`, and there is
 * no clean way for two apps to share one without duplicating the schema or
 * publishing it as a package of its own. Duplicating it is worse than this —
 * two schemas drifting apart in silence — and publishing it meant redoing the
 * whole back. The worker writes four statements; all four are below, in plain
 * sight.
 *
 * The worker **only writes**. Everything it needs to read is handed to it by
 * the back in the workflow argument, precisely so this file does not grow.
 */

const TABLE = 'form_generations';

/** Postgres enum backing the `status` column. */
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
 * `updated_at` is written by hand in every statement.
 *
 * In the schema it is `@updatedAt`, which Prisma resolves **on the client**:
 * the column has neither a trigger nor a default keeping it up to date. Since
 * the worker does not go through Prisma, if it did not touch it here the column
 * would keep the insertion time while the request travels the whole pipeline.
 */
const TOUCH_UPDATED_AT = `${columns.updatedAt} = now()`;

/** Human verdict → terminal status. A `Record`, not an `if` (§5). */
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
   * Status advance. `attempts` is only touched if provided: there are status
   * changes that do not consume an attempt (RETRIEVING, VALIDATING).
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
   * Stores the result and leaves the request awaiting review.
   *
   * A single statement for all three things: the draft, the compiled schema and
   * the status. Were there two, there would be an instant with the schema
   * stored and the old status — and since the status change is what fires the
   * `NOTIFY`, the front could receive the notification before the schema was
   * written.
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
