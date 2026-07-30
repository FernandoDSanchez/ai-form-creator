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
 * Multiple document picker.
 *
 * Checkboxes and not a `<select multiple>`: there are few options, the status
 * of each one has to be visible, and a multiple select is one of the hardest
 * things to use well in native HTML (you have to know it is done with ctrl).
 *
 * The documents arrive as props. The feature does not fetch them: they belong
 * to `regulatory-documents`, and the one composing them is the route (§1).
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
        There are no regulatory documents loaded yet. You can still generate:
        the form will come from the request alone.
      </p>
    );
  }

  return (
    <fieldset className="gap-xs flex flex-col" aria-describedby={groupId}>
      <legend className="text-content text-sm font-medium">
        Regulatory documents
      </legend>
      <p id={groupId} className="text-content-muted mb-xs text-xs">
        Up to {formGenerationLimits.maxRegulatoryDocuments}. The more there are,
        the more diluted each one gets in the model&rsquo;s context.
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
                  // The cap stops additions, never removals: if it is already
                  // selected it has to be unselectable even when the limit has
                  // been reached.
                  disabled={isDisabled || (hasReachedLimit && !isSelected)}
                  onChange={() => handleToggle(document.id)}
                  className="accent-brand-600"
                />
                <span className="text-content">{document.fileName}</span>
                {isIndexed ? null : (
                  // It is not disabled: while the ingestion pipeline does not
                  // exist, every document is in PENDING, and blocking them
                  // would leave the picker useless. It warns and lets you
                  // decide.
                  <span className="text-content-muted text-xs">
                    · not indexed, may contribute little
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
