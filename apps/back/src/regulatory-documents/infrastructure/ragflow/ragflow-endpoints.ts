/**
 * URLs y contrato de la API de RAGFlow. Todo lo que sabe el backend sobre la
 * forma de esa API vive acá (mismo criterio que `config/api-endpoints.ts` de
 * cada feature del front).
 *
 * Referencia: `ragflow/docs/references/http_api_reference.md` → Upload documents.
 */

/** RAGFlow responde 200 siempre; el éxito se lee de `code`. */
export const RAGFLOW_SUCCESS_CODE = 0;

export const ragflowEndpoints = {
  uploadDocuments: (datasetId: string) =>
    `/api/v1/datasets/${datasetId}/documents`,
} as const;

/** Campo multipart que espera RAGFlow (acepta varios; nosotros mandamos uno). */
export const RAGFLOW_FILE_FIELD = 'file';
