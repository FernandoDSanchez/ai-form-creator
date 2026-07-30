import { Type, type Static } from '@sinclair/typebox';

import { formats } from '../formats.js';

import { formGenerationReviewSchema } from './form-generation.js';

/**
 * El contrato del otro cable.
 *
 * Entre el back y el worker no hay HTTP: hay una cola de Temporal. Pero es una
 * frontera igual —dos procesos, dos imágenes, dos despliegues— y se rompe
 * igual de callada: si el back arranca `'generateForm'` en la cola
 * `'form-generation'` y el worker escucha `'form-generations'`, nadie falla,
 * nadie loguea nada, y el workflow se queda encolado para siempre. Por eso los
 * nombres se declaran una sola vez y acá, junto al resto de lo que cruza.
 */

/** Cola donde el back encola y el worker escucha. */
export const formGenerationTaskQueue = 'form-generation';

/** Nombre registrado del workflow (la función exportada del worker). */
export const generateFormWorkflowType = 'generateForm';

/** Señales que el back le manda a un workflow en vuelo. */
export const formGenerationSignals = {
  /** Llega cuando una persona aprueba o rechaza. Destraba la espera. */
  review: 'review',
} as const;

/**
 * Id del workflow, derivado del id de la fila.
 *
 * Determinista a propósito: para mandarle la señal de revisión no hace falta
 * guardar ningún `runId`, alcanza con el id que el cliente ya tiene. Y de yapa,
 * Temporal rechaza arrancar dos veces el mismo id, así que un doble disparo
 * sobre la misma solicitud no genera dos workflows.
 */
export const formGenerationWorkflowId = (formGenerationId: string): string =>
  `form-generation:${formGenerationId}`;

// La IIFE mantiene a TypeBox fuera del bundle del front, que importa de acá los
// nombres de cola y señal. Ver la nota al pie de `generated-form.ts`.
const workflowRegulatoryDocumentSchema = /* @__PURE__ */ (() =>
  Type.Object({
    /** Id nuestro, el de la tabla `regulatory_documents`. */
    id: Type.String({ format: formats.uuid }),
    ragflowDocumentId: Type.String({ minLength: 1 }),
    ragflowDatasetId: Type.String({ minLength: 1 }),
  }))();

export type WorkflowRegulatoryDocument = Static<
  typeof workflowRegulatoryDocumentSchema
>;

/**
 * Lo que recibe el workflow al arrancar.
 *
 * Los documentos viajan ya resueltos —con su id de RAGFlow adentro— en vez de
 * mandar sólo los ids y que el worker los busque. Dos razones:
 *
 *  1. El worker no necesita leer de la base. Sus únicas sentencias son
 *     escrituras de estado, y eso achica mucho lo que se rompe el día que la
 *     tabla cambie (el esquema lo gobierna `apps/back/prisma/schema.prisma`).
 *  2. La generación queda atada a los documentos que había **al momento del
 *     pedido**. Si alguien borra o reindexa uno mientras el workflow corre, lo
 *     que se generó sigue siendo explicable.
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
      description: 'Argumento único del workflow de generación.',
    },
  ))();

export type GenerateFormWorkflowInput = Static<
  typeof generateFormWorkflowInputSchema
>;

/** Carga útil de la señal de revisión. Es el mismo cuerpo que recibe el back. */
export const formGenerationReviewSignalSchema = formGenerationReviewSchema;

export type FormGenerationReviewSignal = Static<
  typeof formGenerationReviewSignalSchema
>;
