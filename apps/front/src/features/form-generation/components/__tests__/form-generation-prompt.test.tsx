import { regulatoryDocumentStatuses } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetFormGenerations } from '@/testing/mocks/data/form-generations';
import { renderApp, screen, waitFor } from '@/testing/test-utils';

import type { SelectableRegulatoryDocument } from '../../types/selectable-regulatory-document';
import { FormGenerationPrompt } from '../form-generation-prompt';

const documents: SelectableRegulatoryDocument[] = [
  {
    id: '3f1d9d2e-0b8a-4c5e-9f11-2a7b6c8d9e01',
    fileName: 'resolution-1234.pdf',
    status: regulatoryDocumentStatuses.indexed,
  },
  {
    id: '8c2a4b6d-1e3f-4a70-9b25-5d8e0f1a2b34',
    fileName: 'ruling-2026.pdf',
    status: regulatoryDocumentStatuses.pending,
  },
];

const A_VALID_PROMPT =
  'I need the import declaration form with sanitary control.';

describe('FormGenerationPrompt', () => {
  beforeEach(() => {
    resetFormGenerations();
  });

  it('does not send the request if it is too short', async () => {
    const onRequested = vi.fn();
    const { user } = renderApp(
      <FormGenerationPrompt documents={documents} onRequested={onRequested} />,
    );

    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onRequested).not.toHaveBeenCalled();
  });

  it('sends the request with the chosen documents', async () => {
    const onRequested = vi.fn();
    const { user } = renderApp(
      <FormGenerationPrompt documents={documents} onRequested={onRequested} />,
    );

    await user.type(screen.getByRole('textbox'), A_VALID_PROMPT);
    await user.click(
      screen.getByRole('checkbox', { name: /resolution-1234\.pdf/i }),
    );
    await user.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => expect(onRequested).toHaveBeenCalledTimes(1));

    const [formGeneration] = onRequested.mock.calls[0] as [
      { prompt: string; regulatoryDocumentIds: string[] },
    ];

    expect(formGeneration.prompt).toBe(A_VALID_PROMPT);
    expect(formGeneration.regulatoryDocumentIds).toEqual([documents[0]?.id]);
  });

  it('warns that a non-indexed document may contribute little', () => {
    // It is not disabled: while the ingestion pipeline does not exist, every
    // document is in PENDING and blocking them would leave the picker
    // useless.
    renderApp(
      <FormGenerationPrompt documents={documents} onRequested={vi.fn()} />,
    );

    expect(
      screen.getByRole('checkbox', { name: /ruling-2026\.pdf/i }),
    ).toBeEnabled();
    expect(screen.getByText(/not indexed/i)).toBeInTheDocument();
  });

  it('works with no documents loaded', () => {
    // Generating without documents is valid: the form comes from the request
    // and the vocabulary.
    renderApp(<FormGenerationPrompt documents={[]} onRequested={vi.fn()} />);

    expect(screen.getByRole('button', { name: /generate/i })).toBeEnabled();
    expect(
      screen.getByText(/no regulatory documents loaded/i),
    ).toBeInTheDocument();
  });
});
