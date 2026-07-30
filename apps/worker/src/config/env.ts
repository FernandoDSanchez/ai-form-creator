import 'dotenv/config';

import { z } from 'zod';

/**
 * Único punto del worker que lee `process.env`. Mismo criterio que el back: si
 * falta una variable, el proceso no arranca — mejor un crash al boot que
 * descubrirlo cuando el primer workflow ya consumió su reintento.
 *
 * `workflows/` tiene prohibido importar este archivo (lo verifica ESLint): en
 * el sandbox determinista no hay `process.env`.
 */

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  /** postgresql://app:…@app-postgres:5432/ai_form_creator */
  DATABASE_URL: z.string().min(1),

  /** Frontend de Temporal. En el cluster: temporal-server:7233 */
  TEMPORAL_ADDRESS: z.string().min(1),
  TEMPORAL_NAMESPACE: z.string().min(1).default('default'),

  /** Proxy de modelos. En el cluster: http://litellm:4000 */
  LITELLM_BASE_URL: z.url(),

  /**
   * Virtual key de LiteLLM. Una por consumidor: la del worker es distinta de la
   * que usa RAGFlow, así se rotan por separado y el gasto se atribuye solo.
   */
  LITELLM_API_KEY: z.string().min(1),

  /**
   * Modelo a usar, con el prefijo de proveedor que espera LiteLLM
   * (`gemini-flash-latest`, `anthropic/claude-sonnet-5`…). Va por env y no
   * en el código porque cambiar de modelo no debería ser un despliegue.
   */
  LITELLM_MODEL: z.string().min(1),

  /** API HTTP de RAGFlow. En el cluster: http://ragflow:9380 */
  RAGFLOW_API_URL: z.url(),
  RAGFLOW_API_KEY: z.string().min(1),
  RAGFLOW_DATASET_ID: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detail = z.prettifyError(parsed.error);
  throw new Error(`Variables de entorno inválidas:\n${detail}`);
}

export const env = parsed.data;

export type Env = typeof env;
