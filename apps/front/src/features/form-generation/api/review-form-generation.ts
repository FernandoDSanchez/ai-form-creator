import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/lib/react-query';

import {
  formGenerationEndpoints,
  formGenerationQueryKeys,
} from '../config/api-endpoints';
import type { FormGenerationReview } from '../types/form-generation';

export type ReviewFormGenerationInput = {
  formGenerationId: string;
  review: FormGenerationReview;
};

/**
 * Manda el veredicto. Responde 204 y sin cuerpo, a propósito: el estado final
 * no lo escribe el endpoint sino el worker, cuando recibe la señal. Llega por
 * el WebSocket como cualquier otro cambio.
 */
export const reviewFormGeneration = ({
  formGenerationId,
  review,
}: ReviewFormGenerationInput): Promise<void> =>
  api.post(formGenerationEndpoints.review(formGenerationId), review);

type UseReviewFormGenerationOptions = {
  mutationConfig?: MutationConfig<typeof reviewFormGeneration>;
};

export const useReviewFormGeneration = ({
  mutationConfig,
}: UseReviewFormGenerationOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig ?? {};

  return useMutation({
    mutationFn: reviewFormGeneration,
    onSuccess: (result, variables, ...rest) => {
      // No se escribe el estado a mano: el que manda es el worker. Se invalida
      // para que, si el socket no está, el refetch traiga el desenlace.
      void queryClient.invalidateQueries({
        queryKey: formGenerationQueryKeys.detail(variables.formGenerationId),
      });

      onSuccess?.(result, variables, ...rest);
    },
    ...restConfig,
  });
};
