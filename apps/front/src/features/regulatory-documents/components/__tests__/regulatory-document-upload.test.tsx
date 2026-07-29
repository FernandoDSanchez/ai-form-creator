import { describe, expect, it } from 'vitest';

import { regulatoryDocumentStatusVariants } from '@/features/regulatory-documents/config/regulatory-document-status';
import { regulatoryDocumentStatuses } from '@/features/regulatory-documents/types/regulatory-document';
import { regulatoryDocumentsDb } from '@/testing/mocks/data/regulatory-documents';
import { renderApp, screen } from '@/testing/test-utils';

import { RegulatoryDocumentUpload } from '../regulatory-document-upload';

const FILE_INPUT_LABEL = 'Documento regulatorio';
const SUBMIT_LABEL = 'Subir documento';
const EMPTY_STATE = 'Todavía no subiste ningún documento en esta sesión.';

const aPdf = () =>
  new File(['%PDF-1.7'], 'resolucion-1234.pdf', { type: 'application/pdf' });

/**
 * Extensión de PDF pero contenido de texto: es el caso que el `accept` del
 * input no filtra y que el back rechaza mirando los magic numbers.
 */
const aFakePdf = () =>
  new File(['no soy un pdf'], 'disfrazado.pdf', { type: 'text/plain' });

describe('RegulatoryDocumentUpload', () => {
  it('sube el PDF y muestra el documento aceptado en PENDING', async () => {
    const { user } = renderApp(<RegulatoryDocumentUpload />);

    await user.upload(screen.getByLabelText(FILE_INPUT_LABEL), aPdf());
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    expect(
      await screen.findByText(regulatoryDocumentsDb.fileName),
    ).toBeInTheDocument();

    // La etiqueta sale del mapa que indexa el estado del contrato compartido:
    // si el back agregara un estado al pipeline, el `Record` no compilaría
    // hasta que alguien decida cómo se pinta.
    expect(
      screen.getByText(
        regulatoryDocumentStatusVariants[regulatoryDocumentStatuses.pending]
          .label,
      ),
    ).toBeInTheDocument();
  });

  it('rechaza un archivo que no es PDF sin llegar a la API', async () => {
    const { user } = renderApp(<RegulatoryDocumentUpload />);

    await user.upload(screen.getByLabelText(FILE_INPUT_LABEL), aFakePdf());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El documento debe ser un PDF.',
    );

    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // El estado vacío sigue ahí y nunca aparece el fixture del handler: la
    // petición no salió.
    expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument();
    expect(
      screen.queryByText(regulatoryDocumentsDb.fileName),
    ).not.toBeInTheDocument();
  });

  it('avisa si se intenta subir sin elegir archivo', async () => {
    const { user } = renderApp(<RegulatoryDocumentUpload />);

    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Elegí un documento antes de subirlo.',
    );
  });
});
