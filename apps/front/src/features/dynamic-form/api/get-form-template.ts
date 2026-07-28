import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

import {
  dynamicFormEndpoints,
  dynamicFormQueryKeys,
} from '../config/api-endpoints';
import type { FormTemplate } from '../types/form-template';

export const getFormTemplate = (
  formTemplateId: string,
): Promise<FormTemplate> =>
  api.get(dynamicFormEndpoints.formTemplate(formTemplateId));

export const getFormTemplateQueryOptions = (formTemplateId: string) =>
  queryOptions({
    queryKey: dynamicFormQueryKeys.detail(formTemplateId),
    queryFn: () => getFormTemplate(formTemplateId),
  });

type UseFormTemplateOptions = {
  formTemplateId: string;
  queryConfig?: QueryConfig<typeof getFormTemplateQueryOptions>;
};

export const useFormTemplate = ({
  formTemplateId,
  queryConfig,
}: UseFormTemplateOptions) =>
  useQuery({ ...getFormTemplateQueryOptions(formTemplateId), ...queryConfig });
