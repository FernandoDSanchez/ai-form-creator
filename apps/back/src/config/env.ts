import 'dotenv/config';

import { z } from 'zod';

/**
 * The only place in the backend that reads `process.env`. Same as in the front
 * (`src/config/env.ts`): if a variable is missing, the process does not boot —
 * better a crash at boot than a 500 three hours later.
 */

const DEFAULT_PORT = 8080;

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  /** Matches the `containerPort` of the Deployment. */
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),

  /** postgresql://app:…@app-postgres:5432/ai_form_creator */
  DATABASE_URL: z.string().min(1),

  /** RAGFlow HTTP API. In the cluster: http://ragflow:9380 */
  RAGFLOW_API_URL: z.url(),

  /** API key generated from the RAGFlow UI (Bearer). */
  RAGFLOW_API_KEY: z.string().min(1),

  /** Dataset (knowledge base) where regulatory documents land. */
  RAGFLOW_DATASET_ID: z.string().min(1),

  /** Temporal frontend. In the cluster: temporal-server:7233 */
  TEMPORAL_ADDRESS: z.string().min(1),

  /**
   * Temporal namespace. `default` is the one the bundle's auto-setup image
   * creates on its own; it stays configurable because separating by namespace
   * is the cheap way for two environments to share one Temporal cluster.
   */
  TEMPORAL_NAMESPACE: z.string().min(1).default('default'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detail = z.prettifyError(parsed.error);
  throw new Error(`Invalid environment variables:\n${detail}`);
}

export const env = parsed.data;

export type Env = typeof env;
