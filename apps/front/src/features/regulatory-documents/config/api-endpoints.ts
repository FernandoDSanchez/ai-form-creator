/** Feature endpoints. No URL literal outside this file. */
export const regulatoryDocumentEndpoints = {
  regulatoryDocuments: '/regulatory-documents',
} as const;

/** react-query keys of the feature. */
export const regulatoryDocumentQueryKeys = {
  all: ['regulatory-documents'] as const,
  lists: () => [...regulatoryDocumentQueryKeys.all, 'list'] as const,
  detail: (regulatoryDocumentId: string) =>
    [
      ...regulatoryDocumentQueryKeys.all,
      'detail',
      regulatoryDocumentId,
    ] as const,
} as const;
