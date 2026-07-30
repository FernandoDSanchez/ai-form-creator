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
 * Sends the request. It answers 202: the request is written as PENDING and the
 * workflow started, but there is no form yet. What comes back is what tells you
 * which id to keep listening to.
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
      // The detail is seeded with what the POST returned: navigating to the
      // tracking screen there is already state to show, with no spinner flicker
      // from a GET bringing exactly the same thing.
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
