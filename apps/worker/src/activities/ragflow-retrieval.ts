import { z } from 'zod';

import { ragflowConfig } from '../config/app-config';
import { env } from '../config/env';
import type { RetrieveRegulatoryContextInput } from '../domain/ports/form-generation-activities.port';

/**
 * Recuperación en RAGFlow.
 *
 * El pedido del usuario se usa tal cual como consulta: es lo que mejor describe
 * lo que se está buscando. Los `document_ids` acotan la búsqueda a lo que la
 * persona eligió, así que un dataset con cien documentos no mete ruido de los
 * noventa y cinco que no vienen al caso.
 */

const RETRIEVAL_PATH = '/api/v1/retrieval';

/** RAGFlow devuelve 200 con un `code` adentro; 0 es éxito. */
const RAGFLOW_SUCCESS_CODE = 0;

const retrievalResponseSchema = z.object({
  code: z.number(),
  message: z.string().nullish(),
  data: z
    .object({
      chunks: z
        .array(
          z.object({
            content: z.string(),
            document_keyword: z.string().nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
});

export class RegulatoryContextUnavailableError extends Error {
  constructor(reason: string, options?: { cause?: unknown }) {
    super(`No se pudo recuperar el contexto regulatorio: ${reason}`, {
      cause: options?.cause,
    });
    this.name = 'RegulatoryContextUnavailableError';
  }
}

/**
 * Devuelve los fragmentos como un solo texto, cada uno atribuido a su
 * documento.
 *
 * La atribución no es decorativa: sin ella el modelo mezcla dos normas
 * distintas en un mismo formulario sin poder distinguirlas, y quien revisa
 * después no tiene forma de rastrear de dónde salió cada campo.
 */
export const retrieveRegulatoryContext = async ({
  prompt,
  documents,
}: RetrieveRegulatoryContextInput): Promise<string> => {
  if (documents.length === 0) {
    return '';
  }

  const response = await post({
    question: prompt,
    // Los datasets salen de los documentos y no de `RAGFLOW_DATASET_ID`: si
    // alguien movió un documento de dataset, lo que vale es dónde está, no
    // dónde esperábamos que estuviera.
    dataset_ids: [...new Set(documents.map((it) => it.ragflowDatasetId))],
    document_ids: documents.map((it) => it.ragflowDocumentId),
    top_k: ragflowConfig.topK,
    similarity_threshold: ragflowConfig.similarityThreshold,
  });

  const parsed = retrievalResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new RegulatoryContextUnavailableError(
      'la respuesta de RAGFlow no tiene la forma esperada',
      { cause: parsed.error },
    );
  }

  if (parsed.data.code !== RAGFLOW_SUCCESS_CODE) {
    throw new RegulatoryContextUnavailableError(
      parsed.data.message ?? `RAGFlow devolvió code ${parsed.data.code}`,
    );
  }

  const chunks = parsed.data.data?.chunks ?? [];

  // Cero fragmentos no es un error: puede que los documentos no digan nada
  // sobre lo que se pidió, o que todavía se estén indexando. El formulario se
  // genera igual, con menos apoyo — y quien revisa lo va a notar.
  return chunks
    .map(
      (chunk) =>
        `[${chunk.document_keyword ?? 'documento'}]\n${chunk.content.trim()}`,
    )
    .join('\n\n---\n\n');
};

const post = async (body: unknown): Promise<Response> => {
  const url = `${env.RAGFLOW_API_URL}${RETRIEVAL_PATH}`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RAGFLOW_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ragflowConfig.timeoutMs),
    });
  } catch (cause) {
    const reason =
      cause instanceof Error && cause.name === 'TimeoutError'
        ? `no respondió en ${ragflowConfig.timeoutMs} ms`
        : 'no se pudo contactar el servicio';

    throw new RegulatoryContextUnavailableError(reason, { cause });
  }

  if (!response.ok) {
    throw new RegulatoryContextUnavailableError(
      `RAGFlow respondió HTTP ${response.status}`,
    );
  }

  return response;
};
