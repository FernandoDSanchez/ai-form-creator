import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

import {
  regulatoryDocumentEndpoints,
  regulatoryDocumentQueryKeys,
} from '../config/api-endpoints';
import type { AcceptedRegulatoryDocument } from '../types/regulatory-document';

/**
 * Listado de documentos, del más reciente al más viejo.
 *
 * Devuelve la misma vista acotada que el alta (sin `mimeType` ni `updatedAt`):
 * el back sirve las dos con el mismo DTO.
 */
export const getRegulatoryDocuments = (): Promise<
  AcceptedRegulatoryDocument[]
> => api.get(regulatoryDocumentEndpoints.regulatoryDocuments);

export const getRegulatoryDocumentsQueryOptions = () =>
  queryOptions({
    queryKey: regulatoryDocumentQueryKeys.lists(),
    queryFn: getRegulatoryDocuments,
  });

type UseRegulatoryDocumentsOptions = {
  queryConfig?: QueryConfig<typeof getRegulatoryDocumentsQueryOptions>;
};

export const useRegulatoryDocuments = ({
  queryConfig,
}: UseRegulatoryDocumentsOptions = {}) =>
  useQuery({ ...getRegulatoryDocumentsQueryOptions(), ...queryConfig });
