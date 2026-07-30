import { regulatoryDocumentStatuses } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';
import { useId } from 'react';

import { formGenerationLimits } from '../types/form-generation';
import type { SelectableRegulatoryDocument } from '../types/selectable-regulatory-document';

type RegulatoryDocumentPickerProps = {
  documents: SelectableRegulatoryDocument[];
  selectedIds: string[];
  isDisabled?: boolean;
  onChange: (selectedIds: string[]) => void;
};

/**
 * Selector múltiple de documentos.
 *
 * Casillas y no un `<select multiple>`: son pocas opciones, hay que ver el
 * estado de cada una, y un select múltiple es de las cosas más difíciles de
 * usar bien que tiene el HTML nativo (hay que saber que se hace con ctrl).
 *
 * Los documentos llegan por props. No los pide la feature: pertenecen a
 * `regulatory-documents`, y quien las compone es la ruta (§1).
 */
export const RegulatoryDocumentPicker = ({
  documents,
  selectedIds,
  isDisabled = false,
  onChange,
}: RegulatoryDocumentPickerProps) => {
  const groupId = useId();
  const hasReachedLimit =
    selectedIds.length >= formGenerationLimits.maxRegulatoryDocuments;

  const handleToggle = (documentId: string) => {
    onChange(
      selectedIds.includes(documentId)
        ? selectedIds.filter((id) => id !== documentId)
        : [...selectedIds, documentId],
    );
  };

  if (documents.length === 0) {
    return (
      <p className="text-content-muted text-sm">
        Todavía no hay documentos regulatorios cargados. Se puede generar igual:
        el formulario va a salir sólo del pedido.
      </p>
    );
  }

  return (
    <fieldset className="gap-xs flex flex-col" aria-describedby={groupId}>
      <legend className="text-content text-sm font-medium">
        Documentos regulatorios
      </legend>
      <p id={groupId} className="text-content-muted mb-xs text-xs">
        Hasta {formGenerationLimits.maxRegulatoryDocuments}. Cuantos más, más
        diluido queda cada uno en el contexto del modelo.
      </p>

      <ul className="gap-2xs flex flex-col">
        {documents.map((document) => {
          const isSelected = selectedIds.includes(document.id);
          const isIndexed =
            document.status === regulatoryDocumentStatuses.indexed;

          return (
            <li key={document.id}>
              <label className="gap-sm px-sm py-xs hover:bg-surface-sunken flex cursor-pointer items-center rounded-md text-sm">
                <input
                  type="checkbox"
                  checked={isSelected}
                  // El tope frena las altas, nunca las bajas: si ya está
                  // elegido tiene que poder destildarse aunque se haya llegado
                  // al límite.
                  disabled={isDisabled || (hasReachedLimit && !isSelected)}
                  onChange={() => handleToggle(document.id)}
                  className="accent-brand-600"
                />
                <span className="text-content">{document.fileName}</span>
                {isIndexed ? null : (
                  // No se deshabilita: mientras el pipeline de ingesta no
                  // exista, todos los documentos están en PENDING, y bloquearlos
                  // dejaría el selector inservible. Se avisa y se deja decidir.
                  <span className="text-content-muted text-xs">
                    · sin indexar, puede aportar poco
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
};
