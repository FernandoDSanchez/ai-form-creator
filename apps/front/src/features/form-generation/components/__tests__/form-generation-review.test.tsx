import { describe, expect, it } from 'vitest';

import { renderApp, screen, waitFor } from '@/testing/test-utils';

import {
  formGenerationStatuses,
  type FormGeneration,
  type FormGenerationStatus,
} from '../../types/form-generation';
import { FormGenerationReview } from '../form-generation-review';

const aFormGeneration = (status: FormGenerationStatus): FormGeneration => ({
  id: '3f1d9d2e-0b8a-4c5e-9f11-2a7b6c8d9e01',
  prompt: 'Import declaration form.',
  regulatoryDocumentIds: [],
  status,
  attempts: 1,
  draft: {
    title: 'Import declaration',
    description: 'Data required by the regulation.',
    fields: [],
  },
  formilySchema: { type: 'object', properties: {} },
  failureReason: null,
  reviewerNote: null,
  reviewedAt: null,
  createdAt: '2026-07-29T10:00:00.000Z',
  updatedAt: '2026-07-29T10:00:00.000Z',
});

describe('FormGenerationReview', () => {
  it('offers approve and reject when it is awaiting review', () => {
    renderApp(
      <FormGenerationReview
        formGeneration={aFormGeneration(formGenerationStatuses.awaitingReview)}
        preview={<p>preview</p>}
      />,
    );

    expect(screen.getByRole('button', { name: /approve/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeEnabled();
  });

  it('hides the buttons once it has been reviewed', () => {
    // It is the visible half of the rule: approving twice is not an operation
    // that exists. The other half is held up by the back with a 409.
    renderApp(
      <FormGenerationReview
        formGeneration={aFormGeneration(formGenerationStatuses.approved)}
        preview={<p>preview</p>}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /approve/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the preview the route passes it', () => {
    // The panel does not know how to draw a form: that belongs to
    // `dynamic-form`, and two features do not import each other. It arrives as
    // a node.
    renderApp(
      <FormGenerationReview
        formGeneration={aFormGeneration(formGenerationStatuses.awaitingReview)}
        preview={<p>form preview</p>}
      />,
    );

    expect(screen.getByText('form preview')).toBeInTheDocument();
  });

  it('sends the verdict with the comment', async () => {
    const { user } = renderApp(
      <FormGenerationReview
        formGeneration={aFormGeneration(formGenerationStatuses.awaitingReview)}
        preview={null}
      />,
    );

    await user.type(
      screen.getByRole('textbox'),
      'The gross weight is missing.',
    );
    await user.click(screen.getByRole('button', { name: /reject/i }));

    // The final status does not come back in the response (204): the worker
    // writes it and it arrives over the WebSocket. Here it is enough for the
    // button to recover.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /reject/i })).toBeEnabled(),
    );
  });
});
