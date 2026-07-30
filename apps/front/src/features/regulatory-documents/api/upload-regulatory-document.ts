import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/lib/react-query';

import { regulatoryDocumentEndpoints } from '../config/api-endpoints';
import { regulatoryDocumentUpload } from '../config/upload-constraints';
import type { AcceptedRegulatoryDocument } from '../types/regulatory-document';

export type UploadRegulatoryDocumentInput = {
  file: File;
};

/**
 * Uploads the PDF to the ingestion endpoint. It answers 202: the back already
 * stored it in RAGFlow and created the row as PENDING, but processing continues
 * in the background, so what comes back is not indexed yet.
 *
 * No `Content-Type` is set by hand: with a `FormData`, axios builds it on its
 * own with the multipart `boundary`. Setting it by hand breaks the upload.
 */
export const uploadRegulatoryDocument = ({
  file,
}: UploadRegulatoryDocumentInput): Promise<AcceptedRegulatoryDocument> => {
  const formData = new FormData();
  formData.append(regulatoryDocumentUpload.fieldName, file);

  return api.post(regulatoryDocumentEndpoints.regulatoryDocuments, formData);
};

type UseUploadRegulatoryDocumentOptions = {
  mutationConfig?: MutationConfig<typeof uploadRegulatoryDocument>;
};

export const useUploadRegulatoryDocument = ({
  mutationConfig,
}: UseUploadRegulatoryDocumentOptions = {}) =>
  useMutation({ mutationFn: uploadRegulatoryDocument, ...mutationConfig });
