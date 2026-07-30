/**
 * The timing and retry rules of the pipeline.
 *
 * They live in `domain/` and not in `config/` because the workflow reads them,
 * and the workflow cannot touch `config/`: `process.env` does not exist inside
 * the deterministic sandbox. They are also values that **cannot** change
 * without thinking it through — a workflow in flight re-executes with the new
 * code, so changing a timeout here is not the same as changing a timeout on an
 * HTTP server.
 */

/**
 * How many times the form is asked of the model before giving up.
 *
 * Three and no more: the first retry with the validation errors inside fixes
 * almost everything that gets fixed (a missing option, a `name` outside the
 * list). If it still does not validate on the third, the problem is not the
 * model having a bad day — it is the request, the vocabulary or the prompt, and
 * none of the three is fixed by insisting.
 */
export const MAX_GENERATION_ATTEMPTS = 3;

/**
 * How many validation errors are handed back to the model at a time.
 *
 * A schema with an `anyOf` of thirty constants produces dozens of errors for a
 * single misplaced field. Sending them all is burying the signal.
 */
export const MAX_REPORTED_PROBLEMS = 10;

export const generationPolicy = {
  maxAttempts: MAX_GENERATION_ATTEMPTS,

  /**
   * Window for a person to approve or reject.
   *
   * Long on purpose: reviewing a regulatory form may require asking somebody
   * else, and a short expiry would turn a weekend into a FAILED. That a cap
   * exists at all is what stops eternal workflows piling up and taking room in
   * Temporal.
   */
  reviewWindow: '30d',

  /**
   * Timeout of the activities that only write to Postgres. Short by
   * definition; if they take longer than this, the database is in trouble.
   */
  storeTimeout: '30s',

  /** Retrieval in RAGFlow. */
  retrievalTimeout: '1m',

  /**
   * The model call. It has to be larger than the client's HTTP timeout
   * (`llmConfig.timeoutMs`), so the one cutting the call is the client and the
   * error arrives with a message that says something, instead of a bare
   * `ActivityTaskTimedOut`.
   */
  generationTimeout: '5m',

  /**
   * Temporal retries for the activities.
   *
   * Mind the distinction: this covers **transport** failures (LiteLLM not
   * answering, the network dropping). The retry for a form that does not
   * validate is another thing and lives in the workflow loop, because it needs
   * to rewrite the prompt with the errors inside — something a blind retry does
   * not do.
   */
  activityRetry: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
} as const;
