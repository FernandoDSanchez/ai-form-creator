import { regulatoryDocumentStatuses } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetFormGenerations } from '@/testing/mocks/data/form-generations';
import { renderApp, screen, waitFor } from '@/testing/test-utils';

import type { SelectableRegulatoryDocument } from '../../types/selectable-regulatory-document';
import { FormGenerationPrompt } from '../form-generation-prompt';

const documents: SelectableRegulatoryDocument[] = [
  {
    id: '3f1d9d2e-0b8a-4c5e-9f11-2a7b6c8d9e01',
    fileName: 'resolucion-1234.pdf',
    status: regulatoryDocumentStatuses.indexed,
  },
  {
    id: '8c2a4b6d-1e3f-4a70-9b25-5d8e0f1a2b34',
    fileName: 'providencia-2026.pdf',
    status: regulatoryDocumentStatuses.pending,
  },
];

const A_VALID_PROMPT =
  'Necesito el formulario de declaración de importación con control sanitario.';

describe('FormGenerationPrompt', () => {
  beforeEach(() => {
    resetFormGenerations();
  });

  it('no manda el pedido si es demasiado corto', async () => {
    const onRequested = vi.fn();
    const { user } = renderApp(
      <FormGenerationPrompt documents={documents} onRequested={onRequested} />,
    );

    await user.type(screen.getByRole('textbox'), 'hola');
    await user.click(screen.getByRole('button', { name: /generar/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onRequested).not.toHaveBeenCalled();
  });

  it('manda el pedido con los documentos elegidos', async () => {
    const onRequested = vi.fn();
    const { user } = renderApp(
      <FormGenerationPrompt documents={documents} onRequested={onRequested} />,
    );

    await user.type(screen.getByRole('textbox'), A_VALID_PROMPT);
    await user.click(
      screen.getByRole('checkbox', { name: /resolucion-1234\.pdf/i }),
    );
    await user.click(screen.getByRole('button', { name: /generar/i }));

    await waitFor(() => expect(onRequested).toHaveBeenCalledTimes(1));

    const [formGeneration] = onRequested.mock.calls[0] as [
      { prompt: string; regulatoryDocumentIds: string[] },
    ];

    expect(formGeneration.prompt).toBe(A_VALID_PROMPT);
    expect(formGeneration.regulatoryDocumentIds).toEqual([documents[0]?.id]);
  });

  it('avisa que un documento sin indexar puede aportar poco', () => {
    // No se deshabilita: mientras el pipeline de ingesta no exista, todos los
    // documentos están en PENDING y bloquearlos dejaría el selector inservible.
    renderApp(
      <FormGenerationPrompt documents={documents} onRequested={vi.fn()} />,
    );

    expect(
      screen.getByRole('checkbox', { name: /providencia-2026\.pdf/i }),
    ).toBeEnabled();
    expect(screen.getByText(/sin indexar/i)).toBeInTheDocument();
  });

  it('funciona sin ningún documento cargado', () => {
    // Generar sin documentos es válido: el formulario sale del pedido y del
    // vocabulario.
    renderApp(<FormGenerationPrompt documents={[]} onRequested={vi.fn()} />);

    expect(screen.getByRole('button', { name: /generar/i })).toBeEnabled();
    expect(screen.getByText(/todavía no hay documentos/i)).toBeInTheDocument();
  });
});
