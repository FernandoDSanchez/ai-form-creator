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
     * Refresco propio mientras la solicitud no haya terminado.
     *
     * Convive con el WebSocket a propósito, y no lo duplica: el socket es la
     * vía rápida y esto es el piso. Si el socket no conectó, si se cortó, o si
     * la API está mockeada, la pantalla igual avanza — más lento, pero avanza.
     * En cuanto el estado es terminal, se apaga solo.
     */
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      return status && !isTerminalFormGenerationStatus(status)
        ? formGenerationPolling.intervalMs
        : false;
    },
    // El WebSocket escribe la caché directamente; un `staleTime` largo haría
    // que un remontaje mostrara lo viejo hasta el siguiente refetch.
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
