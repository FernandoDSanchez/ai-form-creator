import 'dotenv/config';

import { z } from 'zod';

/**
 * Único punto del backend que lee `process.env`. Igual que en el front
 * (`src/config/env.ts`): si falta una variable, el proceso no arranca — mejor
 * un crash al boot que un 500 a las tres horas.
 */

const DEFAULT_PORT = 8080;

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  /** Coincide con el `containerPort` del Deployment. */
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),

  /** postgresql://app:…@app-postgres:5432/ai_form_creator */
  DATABASE_URL: z.string().min(1),

  /** API HTTP de RAGFlow. En el cluster: http://ragflow:9380 */
  RAGFLOW_API_URL: z.url(),

  /** API key generada desde la UI de RAGFlow (Bearer). */
  RAGFLOW_API_KEY: z.string().min(1),

  /** Dataset (knowledge base) donde aterrizan los documentos regulatorios. */
  RAGFLOW_DATASET_ID: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detail = z.prettifyError(parsed.error);
  throw new Error(`Variables de entorno inválidas:\n${detail}`);
}

export const env = parsed.data;

export type Env = typeof env;
