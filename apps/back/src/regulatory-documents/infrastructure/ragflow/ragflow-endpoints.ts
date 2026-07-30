/**
 * URLs and contract of the RAGFlow API. Everything the backend knows about the
 * shape of that API lives here (same criterion as the `config/api-endpoints.ts`
 * of every front feature).
 *
 * Reference: `ragflow/docs/references/http_api_reference.md` → Upload documents.
 */

/** RAGFlow always answers 200; success is read from `code`. */
export const RAGFLOW_SUCCESS_CODE = 0;

export const ragflowEndpoints = {
  uploadDocuments: (datasetId: string) =>
    `/api/v1/datasets/${datasetId}/documents`,
} as const;

/** Multipart field RAGFlow expects (it accepts several; we send one). */
export const RAGFLOW_FILE_FIELD = 'file';
