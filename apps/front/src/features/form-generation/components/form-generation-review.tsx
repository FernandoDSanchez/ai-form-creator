import { useId, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button/button';

import { useReviewFormGeneration } from '../api/review-form-generation';
import { promptEditor } from '../config/prompt-editor';
import {
  formGenerationLimits,
  formGenerationReviewDecisions,
  formGenerationStatuses,
  type FormGeneration,
  type FormGenerationReviewDecision,
} from '../types/form-generation';

type FormGenerationReviewProps = {
  formGeneration: FormGeneration;
  /**
   * Vista previa del formulario generado.
   *
   * Llega como nodo y no se renderiza acá: dibujarla es cosa de la feature
   * `dynamic-form`, y dos features no se importan entre sí (§1). La compone la
   * ruta, que sí puede ver a las dos.
   */
  preview: ReactNode;
};

/**
 * El paso humano.
 *
 * Existe porque la regla del sistema es que la IA nunca publica sola: el
 * workflow queda detenido en AWAITING_REVIEW hasta que alguien decide. Lo que
 * se aprueba no es un resumen del formulario — es el formulario renderizado,
 * arriba, tal como lo va a ver quien lo llene.
 */
export const FormGenerationReview = ({
  formGeneration,
  preview,
}: FormGenerationReviewProps) => {
  const noteId = useId();
  const [reviewerNote, setReviewerNote] = useState('');

  const reviewMutation = useReviewFormGeneration();
  const isAwaitingReview =
    formGeneration.status === formGenerationStatuses.awaitingReview;

  const handleReview = (decision: FormGenerationReviewDecision) => {
    reviewMutation.mutate({
      formGenerationId: formGeneration.id,
      review: { decision, reviewerNote: reviewerNote.trim() },
    });
  };

  return (
    <section className="gap-md flex flex-col">
      <div className="bg-surface border-border shadow-card p-md gap-sm flex flex-col rounded-lg border">
        <h2 className="text-content text-base font-semibold">
          {formGeneration.draft?.title ?? 'Formulario generado'}
        </h2>
        {formGeneration.draft?.description ? (
          <p className="text-content-muted text-sm">
            {formGeneration.draft.description}
          </p>
        ) : null}
        {preview}
      </div>

      {isAwaitingReview ? (
        <div className="bg-surface border-border shadow-card p-md gap-md flex flex-col rounded-lg border">
          <div className="gap-xs flex flex-col">
            <label
              htmlFor={noteId}
              className="text-content text-sm font-medium"
            >
              Comentario de la revisión
            </label>
            <textarea
              id={noteId}
              value={reviewerNote}
              onChange={(event) => setReviewerNote(event.target.value)}
              rows={promptEditor.rows}
              maxLength={formGenerationLimits.reviewerNoteMaxLength}
              placeholder="Opcional al aprobar; al rechazar, decí qué faltó."
              disabled={reviewMutation.isPending}
              className="border-border bg-surface text-content placeholder:text-content-muted focus:border-brand-500 px-sm py-xs rounded-md border text-sm"
            />
          </div>

          <div className="gap-sm flex flex-wrap">
            <Button
              onClick={() =>
                handleReview(formGenerationReviewDecisions.approve)
              }
              isLoading={reviewMutation.isPending}
            >
              Aprobar
            </Button>
            <Button
              variant="danger"
              onClick={() => handleReview(formGenerationReviewDecisions.reject)}
              disabled={reviewMutation.isPending}
            >
              Rechazar
            </Button>
          </div>

          <p className="text-content-muted text-xs">
            El veredicto viaja al workflow, que está esperándolo. El estado
            final lo escribe el orquestador y llega solo.
          </p>
        </div>
      ) : null}

      {formGeneration.reviewerNote ? (
        <p className="text-content-muted text-sm">
          Comentario de la revisión: {formGeneration.reviewerNote}
        </p>
      ) : null}
    </section>
  );
};
