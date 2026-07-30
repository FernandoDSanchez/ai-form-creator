import { z } from 'zod';

import { ragflowConfig } from '../config/app-config';
import { env } from '../config/env';
import type { RetrieveRegulatoryContextInput } from '../domain/ports/form-generation-activities.port';

/**
 * Retrieval in RAGFlow.
 *
 * The user's request is used as the query as-is: it is what best describes what
 * is being looked for. The `document_ids` narrow the search down to what the
 * person chose, so a dataset with a hundred documents does not add noise from
 * the ninety-five that are beside the point.
 */

const RETRIEVAL_PATH = '/api/v1/retrieval';

/** RAGFlow returns 200 with a `code` inside; 0 is success. */
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
    super(`Could not retrieve the regulatory context: ${reason}`, {
      cause: options?.cause,
    });
    this.name = 'RegulatoryContextUnavailableError';
  }
}

/**
 * Returns the chunks as a single text, each one attributed to its document.
 *
 * The attribution is not decorative: without it the model mixes two different
 * regulations into the same form without being able to tell them apart, and
 * whoever reviews afterwards has no way of tracing where each field came from.
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
    // The datasets come from the documents and not from `RAGFLOW_DATASET_ID`:
    // if somebody moved a document to another dataset, what counts is where it
    // is, not where we expected it to be.
    dataset_ids: [...new Set(documents.map((it) => it.ragflowDatasetId))],
    document_ids: documents.map((it) => it.ragflowDocumentId),
    top_k: ragflowConfig.topK,
    similarity_threshold: ragflowConfig.similarityThreshold,
  });

  const parsed = retrievalResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new RegulatoryContextUnavailableError(
      'the RAGFlow response does not have the expected shape',
      { cause: parsed.error },
    );
  }

  if (parsed.data.code !== RAGFLOW_SUCCESS_CODE) {
    throw new RegulatoryContextUnavailableError(
      parsed.data.message ?? `RAGFlow returned code ${parsed.data.code}`,
    );
  }

  const chunks = parsed.data.data?.chunks ?? [];

  // Zero chunks is not an error: the documents may say nothing about what was
  // asked, or they may still be indexing. The form is generated all the same,
  // with less backing — and whoever reviews will notice.
  return chunks
    .map(
      (chunk) =>
        `[${chunk.document_keyword ?? 'document'}]\n${chunk.content.trim()}`,
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
        ? `it did not answer within ${ragflowConfig.timeoutMs} ms`
        : 'the service could not be reached';

    throw new RegulatoryContextUnavailableError(reason, { cause });
  }

  if (!response.ok) {
    throw new RegulatoryContextUnavailableError(
      `RAGFlow answered HTTP ${response.status}`,
    );
  }

  return response;
};
