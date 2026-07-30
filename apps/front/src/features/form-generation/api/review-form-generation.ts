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
 * Sends the verdict. It answers 204 with no body, on purpose: the final status
 * is not written by the endpoint but by the worker, when it receives the
 * signal. It arrives over the WebSocket like any other change.
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
      // The status is not written by hand: the worker is in charge. It is
      // invalidated so that, if the socket is not there, the refetch brings the
      // outcome.
      void queryClient.invalidateQueries({
        queryKey: formGenerationQueryKeys.detail(variables.formGenerationId),
      });

      onSuccess?.(result, variables, ...rest);
    },
    ...restConfig,
  });
};
