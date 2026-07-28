import type { ISchema } from '@formily/react';

/** Estados posibles de una plantilla (no usar los strings sueltos). */
export const formTemplateStatuses = {
  draft: 'draft',
  published: 'published',
  archived: 'archived',
} as const;

export type FormTemplateStatus =
  (typeof formTemplateStatuses)[keyof typeof formTemplateStatuses];

export type FormTemplateSummary = {
  id: string;
  title: string;
  description: string;
  status: FormTemplateStatus;
  fieldCount: number;
  updatedAt: string;
};

/**
 * `schema` es un JSON Schema de Formily: describe los campos del formulario,
 * qué componente los renderiza (`x-component`) y sus validaciones.
 * Lo produce el backend / la IA, no el frontend.
 */
export type FormTemplate = FormTemplateSummary & {
  schema: ISchema;
};

export type FormValues = Record<string, unknown>;

export type FormResponse = {
  id: string;
  formTemplateId: string;
  values: FormValues;
  createdAt: string;
};
