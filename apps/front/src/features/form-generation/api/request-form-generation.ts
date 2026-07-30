import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/lib/react-query';

import {
  formGenerationEndpoints,
  formGenerationQueryKeys,
} from '../config/api-endpoints';
import type {
  FormGeneration,
  NewFormGeneration,
} from '../types/form-generation';

/**
 * Manda el pedido. Responde 202: la solicitud quedó escrita en PENDING y el
 * workflow arrancó, pero todavía no hay ningún formulario. Lo que vuelve sirve
 * para saber a qué id hay que quedarse escuchando.
 */
export const requestFormGeneration = (
  request: NewFormGeneration,
): Promise<FormGeneration> =>
  api.post(formGenerationEndpoints.formGenerations, request);

type UseRequestFormGenerationOptions = {
  mutationConfig?: MutationConfig<typeof requestFormGeneration>;
};

export const useRequestFormGeneration = ({
  mutationConfig,
}: UseRequestFormGenerationOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig ?? {};

  return useMutation({
    mutationFn: requestFormGeneration,
    onSuccess: (formGeneration, ...rest) => {
      // Se siembra el detalle con lo que devolvió el POST: al navegar a la
      // pantalla de seguimiento ya hay estado que mostrar, sin un parpadeo de
      // spinner por un GET que trae exactamente lo mismo.
      queryClient.setQueryData(
        formGenerationQueryKeys.detail(formGeneration.id),
        formGeneration,
      );
      void queryClient.invalidateQueries({
        queryKey: formGenerationQueryKeys.lists(),
      });

      onSuccess?.(formGeneration, ...rest);
    },
    ...restConfig,
  });
};
