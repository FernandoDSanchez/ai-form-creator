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
  prompt: 'Formulario de declaración de importación.',
  regulatoryDocumentIds: [],
  status,
  attempts: 1,
  draft: {
    title: 'Declaración de importación',
    description: 'Datos exigidos por la resolución.',
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
  it('ofrece aprobar y rechazar cuando está esperando revisión', () => {
    renderApp(
      <FormGenerationReview
        formGeneration={aFormGeneration(formGenerationStatuses.awaitingReview)}
        preview={<p>vista previa</p>}
      />,
    );

    expect(screen.getByRole('button', { name: /aprobar/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /rechazar/i })).toBeEnabled();
  });

  it('esconde los botones cuando ya se revisó', () => {
    // Es la mitad visible de la regla: aprobar dos veces no es una operación
    // que exista. La otra mitad la sostiene el back con un 409.
    renderApp(
      <FormGenerationReview
        formGeneration={aFormGeneration(formGenerationStatuses.approved)}
        preview={<p>vista previa</p>}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /aprobar/i }),
    ).not.toBeInTheDocument();
  });

  it('renderiza la vista previa que le pasa la ruta', () => {
    // El panel no sabe dibujar un formulario: eso es de `dynamic-form`, y dos
    // features no se importan entre sí. Llega como nodo.
    renderApp(
      <FormGenerationReview
        formGeneration={aFormGeneration(formGenerationStatuses.awaitingReview)}
        preview={<p>vista previa del formulario</p>}
      />,
    );

    expect(screen.getByText('vista previa del formulario')).toBeInTheDocument();
  });

  it('manda el veredicto con el comentario', async () => {
    const { user } = renderApp(
      <FormGenerationReview
        formGeneration={aFormGeneration(formGenerationStatuses.awaitingReview)}
        preview={null}
      />,
    );

    await user.type(screen.getByRole('textbox'), 'Falta el peso bruto.');
    await user.click(screen.getByRole('button', { name: /rechazar/i }));

    // El estado final no vuelve en la respuesta (204): lo escribe el worker y
    // llega por el WebSocket. Acá alcanza con que el botón se recupere.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /rechazar/i })).toBeEnabled(),
    );
  });
});
