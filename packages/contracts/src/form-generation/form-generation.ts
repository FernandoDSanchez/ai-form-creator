import { Type, type Static } from '@sinclair/typebox';

import { formats } from '../formats.js';

import {
  formGenerationReviewDecisionSchema,
  formGenerationStatusSchema,
} from './form-generation-status.js';
import { formilyFormSchema } from './formily-form-schema.js';
import { generatedFormSchema } from './generated-form.js';

/**
 * Una solicitud de generación: el pedido en lenguaje natural, los documentos
 * que le dan contexto, y todo lo que el pipeline fue dejando encima.
 *
 * Igual que `RegulatoryDocument`, las fechas viajan como string ISO 8601: lo
 * que cruza el cable es JSON. La conversión pasa una sola vez, en el mapper de
 * Prisma del back.
 */

const PROMPT_MIN_LENGTH = 10;
const PROMPT_MAX_LENGTH = 2000;
const MAX_REGULATORY_DOCUMENTS = 5;
const REVIEWER_NOTE_MAX_LENGTH = 1000;

/**
 * Límites del pedido. Los usan las tres puntas: el `maxLength` del textarea del
 * front, el DTO del back y el mensaje de error. Un solo número.
 *
 * El tope de documentos no es capricho: cada uno suma chunks al contexto que
 * viaja en el prompt, y a partir de cierto punto el modelo empieza a ignorar
 * los del medio.
 */
export const formGenerationLimits = {
  promptMinLength: PROMPT_MIN_LENGTH,
  promptMaxLength: PROMPT_MAX_LENGTH,
  maxRegulatoryDocuments: MAX_REGULATORY_DOCUMENTS,
  reviewerNoteMaxLength: REVIEWER_NOTE_MAX_LENGTH,
} as const;

// La IIFE evita que las llamadas anidadas retengan TypeBox en el bundle del
// front, que importa de este módulo sólo `formGenerationLimits`. Ver la nota al
// pie de `generated-form.ts`.
export const formGenerationSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      id: Type.String({ format: formats.uuid }),

      /** El pedido, tal cual lo escribió la persona. */
      prompt: Type.String({
        minLength: PROMPT_MIN_LENGTH,
        maxLength: PROMPT_MAX_LENGTH,
      }),

      /**
       * Documentos elegidos, por su id **nuestro** (no el de RAGFlow).
       *
       * Puede venir vacío: generar sin documentos es válido, sale un formulario
       * apoyado sólo en el vocabulario y en el pedido.
       */
      regulatoryDocumentIds: Type.Array(Type.String({ format: formats.uuid }), {
        maxItems: MAX_REGULATORY_DOCUMENTS,
      }),

      status: formGenerationStatusSchema,

      /** Cuántas veces se le pidió el formulario al modelo. Arranca en 0. */
      attempts: Type.Integer({ minimum: 0 }),

      /** Lo que devolvió el modelo y pasó la validación. `null` hasta entonces. */
      draft: Type.Union([generatedFormSchema, Type.Null()]),

      /** El borrador compilado. Es lo que renderiza el front. */
      formilySchema: Type.Union([formilyFormSchema, Type.Null()]),

      /** Por qué se cayó, en castellano. Sólo con estado FAILED. */
      failureReason: Type.Union([Type.String(), Type.Null()]),

      /** Comentario de quien revisó. */
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
      description: 'Solicitud de generación de un formulario y su estado.',
    },
  ))();

export type FormGeneration = Static<typeof formGenerationSchema>;

/**
 * El cuerpo del `POST /form-generations`: lo único que aporta el cliente.
 *
 * Se deriva con `Type.Pick` en vez de redeclararse, así un cambio en el límite
 * del prompt llega solo a las dos puntas.
 */
export const newFormGenerationSchema = /* @__PURE__ */ Type.Pick(
  formGenerationSchema,
  ['prompt', 'regulatoryDocumentIds'],
  { $id: 'NewFormGeneration' },
);

export type NewFormGeneration = Static<typeof newFormGenerationSchema>;

/** El cuerpo del `POST /form-generations/:id/review`. */
export const formGenerationReviewSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      decision: formGenerationReviewDecisionSchema,
      reviewerNote: Type.String({ maxLength: REVIEWER_NOTE_MAX_LENGTH }),
    },
    {
      $id: 'FormGenerationReview',
      description: 'Veredicto humano sobre un formulario generado.',
    },
  ))();

export type FormGenerationReview = Static<typeof formGenerationReviewSchema>;
