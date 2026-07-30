import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

import {
  formGenerationEndpoints,
  formGenerationQueryKeys,
} from '../config/api-endpoints';
import { formGenerationPolling } from '../config/stream-config';
import {
  isTerminalFormGenerationStatus,
  type FormGeneration,
} from '../types/form-generation';

export const getFormGeneration = (
  formGenerationId: string,
): Promise<FormGeneration> =>
  api.get(formGenerationEndpoints.formGeneration(formGenerationId));

export const getFormGenerationQueryOptions = (formGenerationId: string) =>
  queryOptions({
    queryKey: formGenerationQueryKeys.detail(formGenerationId),
    queryFn: () => getFormGeneration(formGenerationId),
    /**
     * A refresh of its own while the request has not finished.
     *
     * It coexists with the WebSocket on purpose, and does not duplicate it: the
     * socket is the fast lane and this is the floor. If the socket never
     * connected, if it dropped, or if the API is mocked, the screen still moves
     * forward — slower, but it moves. As soon as the status is terminal, it
     * switches itself off.
     */
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      return status && !isTerminalFormGenerationStatus(status)
        ? formGenerationPolling.intervalMs
        : false;
    },
    // The WebSocket writes the cache directly; a long `staleTime` would make a
    // remount show stale data until the next refetch.
    staleTime: 0,
  });

type UseFormGenerationOptions = {
  formGenerationId: string;
  queryConfig?: QueryConfig<typeof getFormGenerationQueryOptions>;
};

export const useFormGeneration = ({
  formGenerationId,
  queryConfig,
}: UseFormGenerationOptions) =>
  useQuery({
    ...getFormGenerationQueryOptions(formGenerationId),
    ...queryConfig,
  });
