import { ContentLayout } from '@/components/layouts/content-layout';
import { RegulatoryDocumentUpload } from '@/features/regulatory-documents/components/regulatory-document-upload';

const RegulatoryDocumentsRoute = () => (
  <ContentLayout
    title="Documentos regulatorios"
    description="Subí un PDF para que entre al pipeline de ingesta."
  >
    <RegulatoryDocumentUpload />
  </ContentLayout>
);

export default RegulatoryDocumentsRoute;
