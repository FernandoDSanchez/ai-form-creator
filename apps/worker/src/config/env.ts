import 'dotenv/config';

import { z } from 'zod';

/**
 * The only place in the worker that reads `process.env`. Same criterion as the
 * back: if a variable is missing, the process does not boot — better a crash at
 * boot than finding out once the first workflow already burned its retry.
 *
 * `workflows/` is forbidden from importing this file (ESLint checks it): there
 * is no `process.env` in the deterministic sandbox.
 */

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  /** postgresql://app:…@app-postgres:5432/ai_form_creator */
  DATABASE_URL: z.string().min(1),

  /** Temporal frontend. In the cluster: temporal-server:7233 */
  TEMPORAL_ADDRESS: z.string().min(1),
  TEMPORAL_NAMESPACE: z.string().min(1).default('default'),

  /** Model proxy. In the cluster: http://litellm:4000 */
  LITELLM_BASE_URL: z.url(),

  /**
   * LiteLLM virtual key. One per consumer: the worker's differs from the one
   * RAGFlow uses, so they rotate separately and the spend attributes itself.
   */
  LITELLM_API_KEY: z.string().min(1),

  /**
   * Model to use, with the provider prefix LiteLLM expects
   * (`gemini-flash-latest`, `anthropic/claude-sonnet-5`…). It goes through env
   * and not in the code because switching models should not be a deployment.
   */
  LITELLM_MODEL: z.string().min(1),

  /** RAGFlow HTTP API. In the cluster: http://ragflow:9380 */
  RAGFLOW_API_URL: z.url(),
  RAGFLOW_API_KEY: z.string().min(1),
  RAGFLOW_DATASET_ID: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detail = z.prettifyError(parsed.error);
  throw new Error(`Invalid environment variables:\n${detail}`);
}

export const env = parsed.data;

export type Env = typeof env;
