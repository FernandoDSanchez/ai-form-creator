/** Feature endpoints. No URL literal outside this file. */
export const dynamicFormEndpoints = {
  formTemplates: '/form-templates',
  formTemplate: (formTemplateId: string) => `/form-templates/${formTemplateId}`,
  formResponses: (formTemplateId: string) =>
    `/form-templates/${formTemplateId}/responses`,
} as const;

/** react-query keys of the feature. */
export const dynamicFormQueryKeys = {
  all: ['form-templates'] as const,
  lists: () => [...dynamicFormQueryKeys.all, 'list'] as const,
  detail: (formTemplateId: string) =>
    [...dynamicFormQueryKeys.all, 'detail', formTemplateId] as const,
} as const;
