/**
 * Constantes del worker que **no** son del workflow.
 *
 * Todo lo que el workflow necesita (reintentos, timeouts, ventana de revisión)
 * vive en `domain/generation-policy.ts`, porque el sandbox no puede importar
 * de acá. Lo de este archivo son los ajustes de los adaptadores.
 */

const MILLISECONDS_PER_SECOND = 1000;
const LLM_TIMEOUT_SECONDS = 120;
const RAGFLOW_TIMEOUT_SECONDS = 30;
const DB_POOL_MAX_CLIENTS = 5;
const DB_IDLE_TIMEOUT_SECONDS = 30;

export const llmConfig = {
  /**
   * Generoso: un formulario de veinte campos con contexto del RAG adentro es
   * una respuesta larga, y algunos modelos razonan antes de emitirla. Acotado
   * igual, porque una actividad colgada consume un slot del worker hasta que
   * Temporal la dé por vencida.
   */
  timeoutMs: LLM_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND,
  /**
   * Baja pero no cero. Cero volvería el pipeline determinista, que suena bien
   * hasta que el reintento por errores de schema devuelve exactamente la misma
   * respuesta inválida las tres veces.
   */
  temperature: 0.2,
} as const;

export const ragflowConfig = {
  timeoutMs: RAGFLOW_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND,
  /** Cuántos fragmentos traer. Más contexto no es mejor: diluye el pedido. */
  topK: 8,
  /** Piso de similitud. Debajo de esto el fragmento no habla del tema. */
  similarityThreshold: 0.2,
} as const;

export const databaseConfig = {
  /**
   * El worker abre pocas conexiones a propósito: sus escrituras son un UPDATE
   * corto por cambio de estado, y el Postgres de la app lo comparte con el
   * back, que tiene sus propias réplicas.
   */
  maxClients: DB_POOL_MAX_CLIENTS,
  idleTimeoutMs: DB_IDLE_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND,
} as const;
