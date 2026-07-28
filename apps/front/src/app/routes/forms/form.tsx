import { useParams } from 'react-router';

import { AppLayout } from '@/components/layouts/app-layout';
import { FormTemplateDetail } from '@/features/dynamic-form/components/form-template-detail';

const FormRoute = () => {
  const { formTemplateId } = useParams<{ formTemplateId: string }>();

  if (!formTemplateId) return null;

  return (
    <AppLayout>
      <FormTemplateDetail formTemplateId={formTemplateId} />
    </AppLayout>
  );
};

export default FormRoute;
