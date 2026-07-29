import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from 'react';

import { Button } from '@/components/ui/button/button';
import { useNotifications } from '@/components/ui/notifications/notifications-store';
import { appConfig } from '@/config/app-config';
import { notificationVariants } from '@/config/ui-variants';

import { useUploadRegulatoryDocument } from '../api/upload-regulatory-document';
import { regulatoryDocumentUpload } from '../config/upload-constraints';
import type { AcceptedRegulatoryDocument } from '../types/regulatory-document';
import { formatFileSize } from '../utils/format-file-size';

import { RegulatoryDocumentStatusBadge } from './regulatory-document-status-badge';

const dateFormatter = new Intl.DateTimeFormat(appConfig.locale, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Rechazo temprano, antes de gastar una subida. El back vuelve a validar lo
 * mismo (y mejor: mira los magic numbers del archivo, no la extensión), así
 * que esto es sólo para no hacer esperar al usuario en balde.
 */
const findValidationError = (file: File) => {
  if (file.type !== regulatoryDocumentUpload.acceptedMimeType) {
    return 'El documento debe ser un PDF.';
  }

  if (file.size > regulatoryDocumentUpload.maxFileSizeBytes) {
    return `El archivo supera el límite de ${regulatoryDocumentUpload.maxFileSizeLabel}.`;
  }

  return null;
};

export const RegulatoryDocumentUpload = () => {
  const fileInputId = useId();
  const errorId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  // El back todavía no expone un listado, así que se acumula lo aceptado en
  // esta sesión. Cuando exista `GET /regulatory-documents`, esto se reemplaza
  // por una query y las claves ya están en `config/api-endpoints.ts`.
  const [acceptedDocuments, setAcceptedDocuments] = useState<
    AcceptedRegulatoryDocument[]
  >([]);

  const addNotification = useNotifications((state) => state.addNotification);

  const uploadMutation = useUploadRegulatoryDocument({
    mutationConfig: {
      onSuccess: (document) => {
        setAcceptedDocuments((current) => [document, ...current]);
        setSelectedFile(null);
        setValidationError(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        addNotification({
          type: notificationVariants.success,
          title: 'Documento aceptado',
          message: `${document.fileName} entró al pipeline de ingesta.`,
        });
      },
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setValidationError(file ? findValidationError(file) : null);
  };

  // `SyntheticEvent` y no `FormEvent`: las tipificaciones de React 19 marcan
  // `FormEvent` como deprecado ("no existe tal evento") y mandan a usar
  // `ChangeEvent`, `SubmitEvent` o `SyntheticEvent` según el caso.
  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setValidationError('Elegí un documento antes de subirlo.');
      return;
    }

    const error = findValidationError(selectedFile);
    setValidationError(error);

    if (!error) {
      uploadMutation.mutate({ file: selectedFile });
    }
  };

  return (
    <div className="gap-lg flex flex-col">
      <form
        onSubmit={handleSubmit}
        className="bg-surface border-border shadow-card p-md gap-md flex flex-col rounded-lg border"
      >
        <div className="gap-xs flex flex-col">
          <label
            htmlFor={fileInputId}
            className="text-content text-sm font-medium"
          >
            Documento regulatorio
          </label>
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept={regulatoryDocumentUpload.acceptedExtension}
            onChange={handleFileChange}
            aria-describedby={validationError ? errorId : undefined}
            aria-invalid={validationError ? true : undefined}
            className="text-content-muted file:mr-sm file:border-border file:bg-surface-sunken file:px-sm file:text-content hover:file:bg-surface file:py-xs text-sm file:rounded-md file:border"
          />
          <p className="text-content-muted text-xs">
            PDF, hasta {regulatoryDocumentUpload.maxFileSizeLabel}.
          </p>
        </div>

        {validationError ? (
          <p id={errorId} role="alert" className="text-danger text-sm">
            {validationError}
          </p>
        ) : null}

        <div>
          <Button type="submit" isLoading={uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Subiendo…' : 'Subir documento'}
          </Button>
        </div>
      </form>

      {acceptedDocuments.length === 0 ? (
        <p className="text-content-muted text-sm">
          Todavía no subiste ningún documento en esta sesión.
        </p>
      ) : (
        <ul className="gap-sm flex flex-col">
          {acceptedDocuments.map((document) => (
            <li
              key={document.id}
              className="bg-surface border-border shadow-card p-md gap-sm flex flex-wrap items-center justify-between rounded-lg border"
            >
              <div>
                <p className="text-content text-sm font-medium">
                  {document.fileName}
                </p>
                <p className="text-content-muted mt-2xs text-xs">
                  {formatFileSize(document.sizeBytes)} ·{' '}
                  {dateFormatter.format(new Date(document.createdAt))}
                </p>
              </div>
              <RegulatoryDocumentStatusBadge status={document.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
