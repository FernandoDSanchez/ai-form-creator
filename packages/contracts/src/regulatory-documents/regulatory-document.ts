import { Type, type Static } from '@sinclair/typebox';

// Extensión explícita: la salida ESM la necesita para que Node resuelva el
// import en runtime. TypeScript la mapea a `.ts` al compilar.
import { formats } from '../formats.js';

import { regulatoryDocumentStatusSchema } from './regulatory-document-status.js';

/**
 * Documento regulatorio ya registrado: existe en RAGFlow y tiene fila propia.
 *
 * Es el contrato compartido: la misma definición la usa el dominio del back
 * (`apps/back/src/regulatory-documents/domain/regulatory-document.ts`) y la
 * capa de datos del front. Por eso las fechas viajan como string ISO 8601 y no
 * como `Date`: lo que cruza el cable es JSON, y un `Date` del lado del front
 * sería una mentira de tipos (llega un string igual). La conversión ocurre una
 * sola vez, en el mapper de Prisma del back.
 */
// La IIFE no es adorno. `/* @__PURE__ */ f(x)` dice que `f` no tiene efectos,
// no que `x` no los tenga: las llamadas anidadas de acá abajo son argumentos, y
// el bundler las conserva junto con el import de TypeBox aunque descarte la
// llamada de afuera. Envolviéndolas en una función pasan a ser cuerpo y se van
// con ella. La explicación larga está al pie de
// `form-generation/generated-form.ts`.
export const regulatoryDocumentSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      id: Type.String({ format: formats.uuid }),
      /** `id` del documento del lado de RAGFlow. */
      ragflowDocumentId: Type.String({ minLength: 1 }),
      /** Dataset de RAGFlow que lo contiene. */
      ragflowDatasetId: Type.String({ minLength: 1 }),
      fileName: Type.String({ minLength: 1 }),
      mimeType: Type.String({ minLength: 1 }),
      sizeBytes: Type.Integer({ minimum: 0 }),
      status: regulatoryDocumentStatusSchema,
      createdAt: Type.String({ format: formats.dateTime }),
      updatedAt: Type.String({ format: formats.dateTime }),
    },
    {
      $id: 'RegulatoryDocument',
      description: 'Documento regulatorio registrado en el sistema.',
    },
  ))();

export type RegulatoryDocument = Static<typeof regulatoryDocumentSchema>;

/**
 * Lo que se le pasa al repositorio para crear la fila. El `id` y las fechas
 * los pone el adaptador de persistencia, no el caso de uso.
 *
 * Se deriva con `Type.Omit` en vez de redeclararse: agregar un campo a la
 * entidad lo agrega acá, y quitar uno rompe la compilación donde corresponde.
 */
export const newRegulatoryDocumentSchema = /* @__PURE__ */ Type.Omit(
  regulatoryDocumentSchema,
  ['id', 'createdAt', 'updatedAt'],
  { $id: 'NewRegulatoryDocument' },
);

export type NewRegulatoryDocument = Static<typeof newRegulatoryDocumentSchema>;
