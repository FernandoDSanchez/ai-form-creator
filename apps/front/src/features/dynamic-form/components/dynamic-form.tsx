import { createForm } from '@formily/core';
import { FormProvider, type ISchema } from '@formily/react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button/button';

import { setupValidationLocale } from '../config/validation-locale';
import type { FormValues } from '../types/form-template';

import { SchemaField } from './schema-field';

setupValidationLocale();

type DynamicFormProps = {
  /** Formily JSON Schema describing the fields. */
  schema: ISchema;
  initialValues?: FormValues;
  isSubmitting?: boolean;
  isDisabled?: boolean;
  submitLabel?: string;
  onSubmit: (values: FormValues) => void;
};

/**
 * Renders any form from its schema.
 * It knows no concrete field: the schema rules.
 */
export const DynamicForm = ({
  schema,
  initialValues,
  isSubmitting = false,
  isDisabled = false,
  submitLabel = 'Submit',
  onSubmit,
}: DynamicFormProps) => {
  const form = useMemo(
    () => createForm({ initialValues, editable: !isDisabled }),
    [initialValues, isDisabled],
  );

  const handleSubmit = () => {
    // `form.submit` validates first; if it fails, it does not call the callback.
    form.submit<FormValues>(onSubmit).catch(() => undefined);
  };

  return (
    <FormProvider form={form}>
      <div className="gap-lg flex flex-col">
        <SchemaField schema={schema} />

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isDisabled}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </FormProvider>
  );
};
