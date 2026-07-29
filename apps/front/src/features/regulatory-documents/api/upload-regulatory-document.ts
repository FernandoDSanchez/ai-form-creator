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
 * Sube el PDF al endpoint de ingesta. Responde 202: el back ya lo guardó en
 * RAGFlow y creó la fila en PENDING, pero el procesamiento sigue en segundo
 * plano, así que lo que vuelve todavía no está indexado.
 *
 * No se le pone `Content-Type` a mano: con un `FormData`, axios lo arma solo
 * con el `boundary` del multipart. Fijarlo a mano rompe la subida.
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
