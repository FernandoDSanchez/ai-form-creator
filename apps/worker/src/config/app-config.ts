/**
 * Worker constants that are **not** the workflow's.
 *
 * Everything the workflow needs (retries, timeouts, review window) lives in
 * `domain/generation-policy.ts`, because the sandbox cannot import from here.
 * What lives in this file are the adapter settings.
 */

const MILLISECONDS_PER_SECOND = 1000;
const LLM_TIMEOUT_SECONDS = 120;
const RAGFLOW_TIMEOUT_SECONDS = 30;
const DB_POOL_MAX_CLIENTS = 5;
const DB_IDLE_TIMEOUT_SECONDS = 30;

export const llmConfig = {
  /**
   * Generous: a twenty-field form with RAG context inside is a long answer, and
   * some models reason before emitting it. Bounded all the same, because a hung
   * activity holds a worker slot until Temporal gives up on it.
   */
  timeoutMs: LLM_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND,
  /**
   * Low but not zero. Zero would make the pipeline deterministic, which sounds
   * fine until the retry for schema errors returns exactly the same invalid
   * answer all three times.
   */
  temperature: 0.2,
} as const;

export const ragflowConfig = {
  timeoutMs: RAGFLOW_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND,
  /** How many chunks to bring. More context is not better: it dilutes the ask. */
  topK: 8,
  /** Similarity floor. Below this the chunk is not about the topic. */
  similarityThreshold: 0.2,
} as const;

export const databaseConfig = {
  /**
   * The worker opens few connections on purpose: its writes are one short
   * UPDATE per status change, and it shares the app's Postgres with the back,
   * which has replicas of its own.
   */
  maxClients: DB_POOL_MAX_CLIENTS,
  idleTimeoutMs: DB_IDLE_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND,
} as const;
