/** Endpoints de la feature. Ningún literal de URL fuera de este archivo. */
export const formGenerationEndpoints = {
  formGenerations: '/form-generations',
  formGeneration: (formGenerationId: string) =>
    `/form-generations/${formGenerationId}`,
  review: (formGenerationId: string) =>
    `/form-generations/${formGenerationId}/review`,
} as const;

/** Claves de react-query de la feature. */
export const formGenerationQueryKeys = {
  all: ['form-generations'] as const,
  lists: () => [...formGenerationQueryKeys.all, 'list'] as const,
  detail: (formGenerationId: string) =>
    [...formGenerationQueryKeys.all, 'detail', formGenerationId] as const,
} as const;
