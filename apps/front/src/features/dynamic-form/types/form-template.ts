import type { ISchema } from '@formily/react';

/** Possible statuses of a template (do not use the loose strings). */
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
 * `schema` is a Formily JSON Schema: it describes the form fields, which
 * component renders them (`x-component`) and their validations.
 * It is produced by the backend / the AI, not by the frontend.
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
