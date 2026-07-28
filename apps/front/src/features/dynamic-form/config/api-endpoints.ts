/** Endpoints de la feature. Ningún literal de URL fuera de este archivo. */
export const dynamicFormEndpoints = {
  formTemplates: '/form-templates',
  formTemplate: (formTemplateId: string) => `/form-templates/${formTemplateId}`,
  formResponses: (formTemplateId: string) =>
    `/form-templates/${formTemplateId}/responses`,
} as const;

/** Claves de react-query de la feature. */
export const dynamicFormQueryKeys = {
  all: ['form-templates'] as const,
  lists: () => [...dynamicFormQueryKeys.all, 'list'] as const,
  detail: (formTemplateId: string) =>
    [...dynamicFormQueryKeys.all, 'detail', formTemplateId] as const,
} as const;
