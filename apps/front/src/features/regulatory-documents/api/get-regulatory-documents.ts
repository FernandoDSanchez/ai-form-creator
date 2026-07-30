import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

import {
  regulatoryDocumentEndpoints,
  regulatoryDocumentQueryKeys,
} from '../config/api-endpoints';
import type { AcceptedRegulatoryDocument } from '../types/regulatory-document';

/**
 * List of documents, from the most recent to the oldest.
 *
 * It returns the same narrow view as the upload (without `mimeType` and
 * `updatedAt`): the back serves both with the same DTO.
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
