import type { QueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { ContentLayout } from '@/components/layouts/content-layout';
import { Spinner } from '@/components/ui/spinner/spinner';
import { paths } from '@/config/paths';
import {
  getFormGenerationsQueryOptions,
  useFormGenerations,
} from '@/features/form-generation/api/get-form-generations';
import { FormGenerationPrompt } from '@/features/form-generation/components/form-generation-prompt';
import { FormGenerationsList } from '@/features/form-generation/components/form-generations-list';
import {
  getRegulatoryDocumentsQueryOptions,
  useRegulatoryDocuments,
} from '@/features/regulatory-documents/api/get-regulatory-documents';

/**
 * Composition point of the two features.
 *
 * The document picker is drawn by `form-generation`, but the documents belong
 * to `regulatory-documents`, and two features do not import each other (§1).
 * Here they are fetched and passed as props. It is exactly the case the rule
 * has in mind: the route is the only layer that can see both.
 */
export const clientLoader = (queryClient: QueryClient) => async () => {
  // In parallel: they are independent, and in series the form would take as
  // long to appear as both of them added up.
  await Promise.all([
    queryClient.ensureQueryData(getRegulatoryDocumentsQueryOptions()),
    queryClient.ensureQueryData(getFormGenerationsQueryOptions()),
  ]);

  return null;
};

const FormGenerationsRoute = () => {
  const navigate = useNavigate();
  const documentsQuery = useRegulatoryDocuments();
  const formGenerationsQuery = useFormGenerations();

  return (
    <ContentLayout
      title="Generate a form"
      description="Describe what you need and choose which regulations to lean on."
    >
      <div className="gap-xl flex flex-col">
        <FormGenerationPrompt
          documents={documentsQuery.data ?? []}
          // Once the request is accepted it goes straight to the tracking
          // screen: that is where what the person wants to see now lives.
          onRequested={(formGeneration) =>
            void navigate(
              paths.formGenerations.detail.getHref(formGeneration.id),
            )
          }
        />

        <section className="gap-md flex flex-col">
          <h2 className="text-content text-base font-semibold">
            Recent requests
          </h2>
          {formGenerationsQuery.isLoading ? (
            <Spinner size="md" />
          ) : (
            <FormGenerationsList
              formGenerations={formGenerationsQuery.data ?? []}
            />
          )}
        </section>
      </div>
    </ContentLayout>
  );
};

export default FormGenerationsRoute;
