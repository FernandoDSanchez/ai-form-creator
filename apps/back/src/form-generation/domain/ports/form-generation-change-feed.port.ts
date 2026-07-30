import type { FormGenerationStatus } from '../form-generation-status';

/** What the Postgres notification carries: the id and the new status, nothing else. */
export type FormGenerationChange = {
  formGenerationId: string;
  status: FormGenerationStatus;
};

/**
 * An inverted **inbound** port: the world says something changed.
 *
 * It is needed because the one moving the statuses is another process (the
 * worker), so the back cannot find out through its own use cases. The current
 * adapter is Postgres `LISTEN`
 * (`infrastructure/persistence/postgres-form-generation-change-feed.ts`); it
 * could be a queue without anything in the core changing.
 *
 * It returns an unsubscribe function: the caller is the one who knows when to
 * stop listening, and without that the shutdown leaves callbacks dangling.
 */
export type FormGenerationChangeFeed = {
  onChange(listener: (change: FormGenerationChange) => void): () => void;
};

export const FORM_GENERATION_CHANGE_FEED = Symbol('FormGenerationChangeFeed');
