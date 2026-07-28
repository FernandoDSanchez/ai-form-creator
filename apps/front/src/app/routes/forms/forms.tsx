import type { QueryClient } from '@tanstack/react-query';

import { ContentLayout } from '@/components/layouts/content-layout';
import { getFormTemplatesQueryOptions } from '@/features/dynamic-form/api/get-form-templates';
import { FormTemplatesList } from '@/features/dynamic-form/components/form-templates-list';

export const clientLoader = (queryClient: QueryClient) => async () => {
  const query = getFormTemplatesQueryOptions();
  return (
    queryClient.getQueryData(query.queryKey) ??
    (await queryClient.fetchQuery(query))
  );
};

const FormsRoute = () => (
  <ContentLayout
    title="Formularios"
    description="Plantillas disponibles para responder."
  >
    <FormTemplatesList />
  </ContentLayout>
);

export default FormsRoute;
