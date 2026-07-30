import { Type, type Static } from '@sinclair/typebox';

import { formats } from '../formats.js';

import {
  formGenerationReviewDecisionSchema,
  formGenerationStatusSchema,
} from './form-generation-status.js';
import { formilyFormSchema } from './formily-form-schema.js';
import { generatedFormSchema } from './generated-form.js';

/**
 * A generation request: the natural language ask, the documents giving it
 * context, and everything the pipeline piled on top.
 *
 * Just like `RegulatoryDocument`, dates travel as ISO 8601 strings: what
 * crosses the wire is JSON. The conversion happens exactly once, in the back's
 * Prisma mapper.
 */

const PROMPT_MIN_LENGTH = 10;
const PROMPT_MAX_LENGTH = 2000;
const MAX_REGULATORY_DOCUMENTS = 5;
const REVIEWER_NOTE_MAX_LENGTH = 1000;

/**
 * Limits of the request. All three ends use them: the `maxLength` of the front
 * textarea, the back DTO and the error message. A single number.
 *
 * The document cap is not arbitrary: each one adds chunks to the context that
 * travels in the prompt, and past a certain point the model starts ignoring
 * the ones in the middle.
 */
export const formGenerationLimits = {
  promptMinLength: PROMPT_MIN_LENGTH,
  promptMaxLength: PROMPT_MAX_LENGTH,
  maxRegulatoryDocuments: MAX_REGULATORY_DOCUMENTS,
  reviewerNoteMaxLength: REVIEWER_NOTE_MAX_LENGTH,
} as const;

// The IIFE keeps the nested calls from retaining TypeBox in the front bundle,
// which imports only `formGenerationLimits` from this module. See the note at
// the bottom of `generated-form.ts`.
export const formGenerationSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      id: Type.String({ format: formats.uuid }),

      /** The ask, exactly as the person wrote it. */
      prompt: Type.String({
        minLength: PROMPT_MIN_LENGTH,
        maxLength: PROMPT_MAX_LENGTH,
      }),

      /**
       * Chosen documents, by **our** id (not the RAGFlow one).
       *
       * It may come in empty: generating without documents is valid, and
       * produces a form leaning only on the vocabulary and on the ask.
       */
      regulatoryDocumentIds: Type.Array(Type.String({ format: formats.uuid }), {
        maxItems: MAX_REGULATORY_DOCUMENTS,
      }),

      status: formGenerationStatusSchema,

      /** How many times the form was asked of the model. Starts at 0. */
      attempts: Type.Integer({ minimum: 0 }),

      /** What the model returned and passed validation. `null` until then. */
      draft: Type.Union([generatedFormSchema, Type.Null()]),

      /** The compiled draft. This is what the front renders. */
      formilySchema: Type.Union([formilyFormSchema, Type.Null()]),

      /** Why it fell over, in plain words. Only with status FAILED. */
      failureReason: Type.Union([Type.String(), Type.Null()]),

      /** The reviewer's comment. */
      reviewerNote: Type.Union([Type.String(), Type.Null()]),

      reviewedAt: Type.Union([
        Type.String({ format: formats.dateTime }),
        Type.Null(),
      ]),

      createdAt: Type.String({ format: formats.dateTime }),
      updatedAt: Type.String({ format: formats.dateTime }),
    },
    {
      $id: 'FormGeneration',
      description: 'A form generation request and its status.',
    },
  ))();

export type FormGeneration = Static<typeof formGenerationSchema>;

/**
 * The body of `POST /form-generations`: the only thing the client provides.
 *
 * It is derived with `Type.Pick` instead of redeclared, so a change in the
 * prompt limit reaches both ends on its own.
 */
export const newFormGenerationSchema = /* @__PURE__ */ Type.Pick(
  formGenerationSchema,
  ['prompt', 'regulatoryDocumentIds'],
  { $id: 'NewFormGeneration' },
);

export type NewFormGeneration = Static<typeof newFormGenerationSchema>;

/** The body of `POST /form-generations/:id/review`. */
export const formGenerationReviewSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      decision: formGenerationReviewDecisionSchema,
      reviewerNote: Type.String({ maxLength: REVIEWER_NOTE_MAX_LENGTH }),
    },
    {
      $id: 'FormGenerationReview',
      description: 'Human verdict on a generated form.',
    },
  ))();

export type FormGenerationReview = Static<typeof formGenerationReviewSchema>;
