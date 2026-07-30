import type { FormGeneration, NewFormGeneration } from '../form-generation';

/**
 * Outbound port towards the request store.
 *
 * Reads and the insert only: **the back does not write statuses**. From PENDING
 * onwards, the one moving the row is the Temporal worker, and the back finds
 * out through the change feed. That the port has no `updateStatus` is not an
 * oversight — it is the rule written into the type.
 *
 * Current adapter: `infrastructure/persistence/prisma-form-generation.repository.ts`.
 */
export type FormGenerationRepository = {
  create(formGeneration: NewFormGeneration): Promise<FormGeneration>;
  findById(formGenerationId: string): Promise<FormGeneration | null>;
  findAll(): Promise<FormGeneration[]>;
};

export const FORM_GENERATION_REPOSITORY = Symbol('FormGenerationRepository');
