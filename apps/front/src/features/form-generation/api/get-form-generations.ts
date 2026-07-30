import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

import {
  formGenerationEndpoints,
  formGenerationQueryKeys,
} from '../config/api-endpoints';
import type { FormGeneration } from '../types/form-generation';

export const getFormGenerations = (): Promise<FormGeneration[]> =>
  api.get(formGenerationEndpoints.formGenerations);

export const getFormGenerationsQueryOptions = () =>
  queryOptions({
    queryKey: formGenerationQueryKeys.lists(),
    queryFn: getFormGenerations,
  });

type UseFormGenerationsOptions = {
  queryConfig?: QueryConfig<typeof getFormGenerationsQueryOptions>;
};

export const useFormGenerations = ({
  queryConfig,
}: UseFormGenerationsOptions = {}) =>
  useQuery({ ...getFormGenerationsQueryOptions(), ...queryConfig });
