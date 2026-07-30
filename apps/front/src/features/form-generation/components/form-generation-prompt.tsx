import { useId, useState, type ChangeEvent, type SyntheticEvent } from 'react';

import { Button } from '@/components/ui/button/button';

import { useRequestFormGeneration } from '../api/request-form-generation';
import { promptEditor } from '../config/prompt-editor';
import {
  formGenerationLimits,
  type FormGeneration,
} from '../types/form-generation';
import type { SelectableRegulatoryDocument } from '../types/selectable-regulatory-document';

import { RegulatoryDocumentPicker } from './regulatory-document-picker';

type FormGenerationPromptProps = {
  documents: SelectableRegulatoryDocument[];
  onRequested: (formGeneration: FormGeneration) => void;
};

/**
 * Early rejection, before spending a request. The back validates the same thing
 * with the `ValidationPipe`, so this is not the guarantee — it is not making
 * the person wait a round trip to be told they wrote three words.
 *
 * The limits come from the shared contract: they are the same numbers the
 * back's DTO applies.
 */
const findValidationError = (prompt: string): string | null => {
  const length = prompt.trim().length;

  if (length < formGenerationLimits.promptMinLength) {
    return `Say a bit more: at least ${formGenerationLimits.promptMinLength} characters.`;
  }

  if (length > formGenerationLimits.promptMaxLength) {
    return `The request goes over ${formGenerationLimits.promptMaxLength} characters.`;
  }

  return null;
};

export const FormGenerationPrompt = ({
  documents,
  onRequested,
}: FormGenerationPromptProps) => {
  const promptId = useId();
  const errorId = useId();

  const [prompt, setPrompt] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const requestMutation = useRequestFormGeneration({
    mutationConfig: {
      onSuccess: (formGeneration) => {
        setPrompt('');
        setSelectedIds([]);
        setValidationError(null);
        onRequested(formGeneration);
      },
    },
  });

  const handlePromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);

    // The error is only cleared while typing; it is not validated on every
    // keystroke. Marking a two-letter request in red while it is still being
    // written is telling somebody off for not having finished.
    if (validationError) {
      setValidationError(null);
    }
  };

  // `SyntheticEvent` and not `FormEvent`: the React 19 typings mark
  // `FormEvent` as deprecated.
  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const error = findValidationError(prompt);
    setValidationError(error);

    if (!error) {
      requestMutation.mutate({
        prompt: prompt.trim(),
        regulatoryDocumentIds: selectedIds,
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border-border shadow-card p-md gap-md flex flex-col rounded-lg border"
    >
      <div className="gap-xs flex flex-col">
        <label htmlFor={promptId} className="text-content text-sm font-medium">
          Which form do you need?
        </label>
        <textarea
          id={promptId}
          value={prompt}
          onChange={handlePromptChange}
          rows={promptEditor.rows}
          maxLength={formGenerationLimits.promptMaxLength}
          placeholder={promptEditor.placeholder}
          disabled={requestMutation.isPending}
          aria-describedby={validationError ? errorId : undefined}
          aria-invalid={validationError ? true : undefined}
          className="border-border bg-surface text-content placeholder:text-content-muted focus:border-brand-500 px-sm py-xs rounded-md border text-sm"
        />
        <p className="text-content-muted text-xs">
          {prompt.trim().length} / {formGenerationLimits.promptMaxLength}
        </p>
      </div>

      <RegulatoryDocumentPicker
        documents={documents}
        selectedIds={selectedIds}
        isDisabled={requestMutation.isPending}
        onChange={setSelectedIds}
      />

      {validationError ? (
        <p id={errorId} role="alert" className="text-danger text-sm">
          {validationError}
        </p>
      ) : null}

      <div>
        <Button type="submit" isLoading={requestMutation.isPending}>
          {requestMutation.isPending ? 'Sending…' : 'Generate form'}
        </Button>
      </div>
    </form>
  );
};
