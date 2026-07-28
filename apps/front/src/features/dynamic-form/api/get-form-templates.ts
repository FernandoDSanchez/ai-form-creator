import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

import {
  dynamicFormEndpoints,
  dynamicFormQueryKeys,
} from '../config/api-endpoints';
import type { FormTemplateSummary } from '../types/form-template';

export const getFormTemplates = (): Promise<FormTemplateSummary[]> =>
  api.get(dynamicFormEndpoints.formTemplates);

export const getFormTemplatesQueryOptions = () =>
  queryOptions({
    queryKey: dynamicFormQueryKeys.lists(),
    queryFn: getFormTemplates,
  });

type UseFormTemplatesOptions = {
  queryConfig?: QueryConfig<typeof getFormTemplatesQueryOptions>;
};

export const useFormTemplates = ({
  queryConfig,
}: UseFormTemplatesOptions = {}) =>
  useQuery({ ...getFormTemplatesQueryOptions(), ...queryConfig });
