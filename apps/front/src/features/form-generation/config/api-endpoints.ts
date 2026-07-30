/** Feature endpoints. No URL literal outside this file. */
export const formGenerationEndpoints = {
  formGenerations: '/form-generations',
  formGeneration: (formGenerationId: string) =>
    `/form-generations/${formGenerationId}`,
  review: (formGenerationId: string) =>
    `/form-generations/${formGenerationId}/review`,
} as const;

/** react-query keys of the feature. */
export const formGenerationQueryKeys = {
  all: ['form-generations'] as const,
  lists: () => [...formGenerationQueryKeys.all, 'list'] as const,
  detail: (formGenerationId: string) =>
    [...formGenerationQueryKeys.all, 'detail', formGenerationId] as const,
} as const;
