import { ContentLayout } from '@/components/layouts/content-layout';
import { RegulatoryDocumentUpload } from '@/features/regulatory-documents/components/regulatory-document-upload';

const RegulatoryDocumentsRoute = () => (
  <ContentLayout
    title="Regulatory documents"
    description="Upload a PDF to send it into the ingestion pipeline."
  >
    <RegulatoryDocumentUpload />
  </ContentLayout>
);

export default RegulatoryDocumentsRoute;
