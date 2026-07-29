/** Endpoints de la feature. Ningún literal de URL fuera de este archivo. */
export const regulatoryDocumentEndpoints = {
  regulatoryDocuments: '/regulatory-documents',
} as const;

/** Claves de react-query de la feature. */
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
