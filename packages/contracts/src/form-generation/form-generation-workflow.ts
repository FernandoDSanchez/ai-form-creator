import { Type, type Static } from '@sinclair/typebox';

import { formats } from '../formats.js';

import { formGenerationReviewSchema } from './form-generation.js';

/**
 * The contract of the other wire.
 *
 * There is no HTTP between the back and the worker: there is a Temporal queue.
 * But it is a border all the same — two processes, two images, two deployments
 * — and it breaks just as quietly: if the back starts `'generateForm'` on the
 * `'form-generation'` queue and the worker listens on `'form-generations'`,
 * nothing fails, nothing gets logged, and the workflow stays queued forever.
 * That is why the names are declared once, and here, next to the rest of what
 * crosses over.
 */

/** Queue the back enqueues onto and the worker listens on. */
export const formGenerationTaskQueue = 'form-generation';

/** Registered name of the workflow (the function exported by the worker). */
export const generateFormWorkflowType = 'generateForm';

/** Signals the back sends to an in-flight workflow. */
export const formGenerationSignals = {
  /** Arrives when a person approves or rejects. Unblocks the wait. */
  review: 'review',
} as const;

/**
 * Workflow id, derived from the row id.
 *
 * Deterministic on purpose: sending the review signal requires storing no
 * `runId`, the id the client already has is enough. And as a bonus, Temporal
 * refuses to start the same id twice, so a double trigger on the same request
 * does not spawn two workflows.
 */
export const formGenerationWorkflowId = (formGenerationId: string): string =>
  `form-generation:${formGenerationId}`;

// The IIFE keeps TypeBox out of the front bundle, which imports the queue and
// signal names from here. See the note at the bottom of `generated-form.ts`.
const workflowRegulatoryDocumentSchema = /* @__PURE__ */ (() =>
  Type.Object({
    /** Our id, the one from the `regulatory_documents` table. */
    id: Type.String({ format: formats.uuid }),
    ragflowDocumentId: Type.String({ minLength: 1 }),
    ragflowDatasetId: Type.String({ minLength: 1 }),
  }))();

export type WorkflowRegulatoryDocument = Static<
  typeof workflowRegulatoryDocumentSchema
>;

/**
 * What the workflow receives when it starts.
 *
 * The documents travel already resolved — with their RAGFlow id inside —
 * instead of sending only the ids and having the worker look them up. Two
 * reasons:
 *
 *  1. The worker does not need to read from the database. Its only statements
 *     are status writes, and that shrinks a lot of what breaks the day the
 *     table changes (the schema is governed by `apps/back/prisma/schema.prisma`).
 *  2. The generation stays tied to the documents that existed **at the time of
 *     the request**. If somebody deletes or reindexes one while the workflow is
 *     running, what was generated remains explainable.
 */
export const generateFormWorkflowInputSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      formGenerationId: Type.String({ format: formats.uuid }),
      prompt: Type.String({ minLength: 1 }),
      regulatoryDocuments: Type.Array(workflowRegulatoryDocumentSchema),
    },
    {
      $id: 'GenerateFormWorkflowInput',
      description: 'The single argument of the generation workflow.',
    },
  ))();

export type GenerateFormWorkflowInput = Static<
  typeof generateFormWorkflowInputSchema
>;

/** Payload of the review signal. Same body the back receives. */
export const formGenerationReviewSignalSchema = formGenerationReviewSchema;

export type FormGenerationReviewSignal = Static<
  typeof formGenerationReviewSignalSchema
>;
