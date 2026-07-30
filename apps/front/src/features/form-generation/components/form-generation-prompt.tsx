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
 * Rechazo temprano, antes de gastar un pedido. El back valida lo mismo con el
 * `ValidationPipe`, así que esto no es la garantía — es no hacer esperar a la
 * persona un viaje de ida y vuelta para decirle que escribió tres palabras.
 *
 * Los límites salen del contrato compartido: son los mismos números que aplica
 * el DTO del back.
 */
const findValidationError = (prompt: string): string | null => {
  const length = prompt.trim().length;

  if (length < formGenerationLimits.promptMinLength) {
    return `Contá un poco más: al menos ${formGenerationLimits.promptMinLength} caracteres.`;
  }

  if (length > formGenerationLimits.promptMaxLength) {
    return `El pedido supera los ${formGenerationLimits.promptMaxLength} caracteres.`;
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

    // Sólo se limpia el error mientras se escribe; no se valida en cada tecla.
    // Marcar en rojo un pedido de dos letras que todavía se está escribiendo es
    // regañar a alguien por no haber terminado.
    if (validationError) {
      setValidationError(null);
    }
  };

  // `SyntheticEvent` y no `FormEvent`: las tipificaciones de React 19 marcan
  // `FormEvent` como deprecado.
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
          ¿Qué formulario necesitás?
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
          {requestMutation.isPending ? 'Enviando…' : 'Generar formulario'}
        </Button>
      </div>
    </form>
  );
};
