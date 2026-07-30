import { describe, expect, it } from 'vitest';

import { regulatoryDocumentStatusVariants } from '@/features/regulatory-documents/config/regulatory-document-status';
import { regulatoryDocumentStatuses } from '@/features/regulatory-documents/types/regulatory-document';
import { regulatoryDocumentsDb } from '@/testing/mocks/data/regulatory-documents';
import { renderApp, screen } from '@/testing/test-utils';

import { RegulatoryDocumentUpload } from '../regulatory-document-upload';

const FILE_INPUT_LABEL = 'Regulatory document';
const SUBMIT_LABEL = 'Upload document';
const EMPTY_STATE = 'You have not uploaded any document in this session yet.';

const aPdf = () =>
  new File(['%PDF-1.7'], 'resolution-1234.pdf', { type: 'application/pdf' });

/**
 * A PDF extension but text content: it is the case the input `accept` does not
 * filter and that the back rejects by looking at the magic numbers.
 */
const aFakePdf = () =>
  new File(['I am not a pdf'], 'disguised.pdf', { type: 'text/plain' });

describe('RegulatoryDocumentUpload', () => {
  it('uploads the PDF and shows the accepted document as PENDING', async () => {
    const { user } = renderApp(<RegulatoryDocumentUpload />);

    await user.upload(screen.getByLabelText(FILE_INPUT_LABEL), aPdf());
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    expect(
      await screen.findByText(regulatoryDocumentsDb.fileName),
    ).toBeInTheDocument();

    // The label comes from the map indexing the shared contract status: if the
    // back added a status to the pipeline, the `Record` would not compile until
    // somebody decided how it is painted.
    expect(
      screen.getByText(
        regulatoryDocumentStatusVariants[regulatoryDocumentStatuses.pending]
          .label,
      ),
    ).toBeInTheDocument();
  });

  it('rejects a file that is not a PDF without reaching the API', async () => {
    const { user } = renderApp(<RegulatoryDocumentUpload />);

    await user.upload(screen.getByLabelText(FILE_INPUT_LABEL), aFakePdf());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The document must be a PDF.',
    );

    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // The empty state is still there and the handler fixture never shows up:
    // the request never went out.
    expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument();
    expect(
      screen.queryByText(regulatoryDocumentsDb.fileName),
    ).not.toBeInTheDocument();
  });

  it('warns if an upload is attempted without choosing a file', async () => {
    const { user } = renderApp(<RegulatoryDocumentUpload />);

    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a document before uploading it.',
    );
  });
});
