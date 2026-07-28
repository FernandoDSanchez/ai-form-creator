import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/lib/react-query';

import { dynamicFormEndpoints } from '../config/api-endpoints';
import type { FormResponse, FormValues } from '../types/form-template';

export type SubmitFormResponseInput = {
  formTemplateId: string;
  values: FormValues;
};

export const submitFormResponse = ({
  formTemplateId,
  values,
}: SubmitFormResponseInput): Promise<FormResponse> =>
  api.post(dynamicFormEndpoints.formResponses(formTemplateId), values);

type UseSubmitFormResponseOptions = {
  mutationConfig?: MutationConfig<typeof submitFormResponse>;
};

export const useSubmitFormResponse = ({
  mutationConfig,
}: UseSubmitFormResponseOptions = {}) =>
  useMutation({ mutationFn: submitFormResponse, ...mutationConfig });
