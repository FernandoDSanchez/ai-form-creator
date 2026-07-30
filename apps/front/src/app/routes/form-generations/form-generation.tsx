import type { QueryClient } from '@tanstack/react-query';
import type { LoaderFunctionArgs } from 'react-router';
import { useParams } from 'react-router';

import { ContentLayout } from '@/components/layouts/content-layout';
import { Spinner } from '@/components/ui/spinner/spinner';
import { DynamicForm } from '@/features/dynamic-form/components/dynamic-form';
import {
  getFormGenerationQueryOptions,
  useFormGeneration,
} from '@/features/form-generation/api/get-form-generation';
import { FormGenerationProgress } from '@/features/form-generation/components/form-generation-progress';
import { FormGenerationReview } from '@/features/form-generation/components/form-generation-review';
import { useFormGenerationStream } from '@/features/form-generation/hooks/use-form-generation-stream';

const FORM_GENERATION_ID_PARAM = 'formGenerationId';

export const clientLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const formGenerationId = params[FORM_GENERATION_ID_PARAM];

    if (formGenerationId) {
      await queryClient.ensureQueryData(
        getFormGenerationQueryOptions(formGenerationId),
      );
    }

    return null;
  };

/**
 * Tracking of a request, end to end.
 *
 * It is the other composition point: the form preview is rendered by
 * `dynamic-form` and the review panel belongs to `form-generation`. They come
 * together here because features do not see each other (§1) — the panel
 * receives the preview as a node and does not know who drew it.
 */
const FormGenerationRoute = () => {
  const params = useParams();
  const formGenerationId = params[FORM_GENERATION_ID_PARAM] ?? '';

  const formGenerationQuery = useFormGeneration({ formGenerationId });

  // Subscribes the screen to the status changes. It returns nothing: it only
  // keeps what the query above reads up to date.
  useFormGenerationStream(formGenerationId);

  const formGeneration = formGenerationQuery.data;

  if (!formGeneration) {
    return (
      <ContentLayout title="Request">
        <Spinner size="lg" />
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Request" description={formGeneration.prompt}>
      <div className="gap-lg flex flex-col">
        <FormGenerationProgress formGeneration={formGeneration} />

        {formGeneration.formilySchema ? (
          <FormGenerationReview
            formGeneration={formGeneration}
            preview={
              <DynamicForm
                schema={formGeneration.formilySchema}
                // It is a preview: it shows how it would look, but it is
                // neither filled in nor submitted. Approving is not completing
                // the form.
                isDisabled
                submitLabel="Preview"
                onSubmit={() => undefined}
              />
            }
          />
        ) : null}
      </div>
    </ContentLayout>
  );
};

export default FormGenerationRoute;
