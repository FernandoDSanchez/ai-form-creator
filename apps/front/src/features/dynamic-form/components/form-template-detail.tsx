import { useNotifications } from '@/components/ui/notifications/notifications-store';
import { Spinner } from '@/components/ui/spinner/spinner';
import { notificationVariants } from '@/config/ui-variants';

import { useFormTemplate } from '../api/get-form-template';
import { useSubmitFormResponse } from '../api/submit-form-response';
import { formStatusVariants } from '../config/form-status';
import type { FormValues } from '../types/form-template';
import { normalizeFormValues } from '../utils/normalize-form-values';

import { DynamicForm } from './dynamic-form';
import { FormStatusBadge } from './form-status-badge';

type FormTemplateDetailProps = {
  formTemplateId: string;
};

export const FormTemplateDetail = ({
  formTemplateId,
}: FormTemplateDetailProps) => {
  const addNotification = useNotifications((state) => state.addNotification);
  const formTemplateQuery = useFormTemplate({ formTemplateId });

  const submitFormResponse = useSubmitFormResponse({
    mutationConfig: {
      onSuccess: () =>
        addNotification({
          type: notificationVariants.success,
          title: 'Response submitted',
          message: 'Thanks, your answers have been recorded.',
        }),
    },
  });

  if (formTemplateQuery.isLoading) {
    return (
      <div className="py-xl flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const formTemplate = formTemplateQuery.data;

  if (!formTemplate) {
    return (
      <p className="text-content-muted text-sm">We could not find this form.</p>
    );
  }

  const statusVariant = formStatusVariants[formTemplate.status];

  const handleSubmit = (values: FormValues) => {
    submitFormResponse.mutate({
      formTemplateId,
      values: normalizeFormValues(values),
    });
  };

  return (
    <article className="bg-surface border-border shadow-card p-lg rounded-lg border">
      <header className="mb-lg gap-md flex items-start justify-between">
        <div>
          <h1 className="text-content text-xl font-semibold">
            {formTemplate.title}
          </h1>
          <p className="text-content-muted mt-xs text-sm">
            {formTemplate.description}
          </p>
        </div>
        <FormStatusBadge status={formTemplate.status} />
      </header>

      {statusVariant.isSubmittable ? null : (
        <p className="bg-warning-surface text-warning mb-lg p-sm rounded-md text-sm">
          This form is &ldquo;{statusVariant.label}&rdquo;: you can review it
          but not submit it.
        </p>
      )}

      <DynamicForm
        schema={formTemplate.schema}
        isDisabled={!statusVariant.isSubmittable}
        isSubmitting={submitFormResponse.isPending}
        onSubmit={handleSubmit}
      />
    </article>
  );
};
