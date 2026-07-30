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
   * Preview of the generated form.
   *
   * It arrives as a node and is not rendered here: drawing it belongs to the
   * `dynamic-form` feature, and two features do not import each other (§1). The
   * route composes it, since it can see both.
   */
  preview: ReactNode;
};

/**
 * The human step.
 *
 * It exists because the rule of the system is that the AI never publishes on
 * its own: the workflow stays halted at AWAITING_REVIEW until somebody decides.
 * What gets approved is not a summary of the form — it is the rendered form,
 * above, exactly as whoever fills it in will see it.
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
          {formGeneration.draft?.title ?? 'Generated form'}
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
              Review comment
            </label>
            <textarea
              id={noteId}
              value={reviewerNote}
              onChange={(event) => setReviewerNote(event.target.value)}
              rows={promptEditor.rows}
              maxLength={formGenerationLimits.reviewerNoteMaxLength}
              placeholder="Optional when approving; when rejecting, say what was missing."
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
              Approve
            </Button>
            <Button
              variant="danger"
              onClick={() => handleReview(formGenerationReviewDecisions.reject)}
              disabled={reviewMutation.isPending}
            >
              Reject
            </Button>
          </div>

          <p className="text-content-muted text-xs">
            The verdict travels to the workflow, which is waiting for it. The
            final status is written by the orchestrator and arrives on its own.
          </p>
        </div>
      ) : null}

      {formGeneration.reviewerNote ? (
        <p className="text-content-muted text-sm">
          Review comment: {formGeneration.reviewerNote}
        </p>
      ) : null}
    </section>
  );
};
