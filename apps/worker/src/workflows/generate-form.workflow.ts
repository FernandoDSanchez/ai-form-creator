import {
  formGenerationReviewDecisions,
  formGenerationStatuses,
  type FormGenerationStatus,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';
import {
  formGenerationSignals,
  type FormGenerationReviewSignal,
  type GenerateFormWorkflowInput,
} from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import {
  CancellationScope,
  condition,
  defineSignal,
  log,
  proxyActivities,
  setHandler,
} from '@temporalio/workflow';

import { generationPolicy } from '../domain/generation-policy';
import type { FormGenerationActivities } from '../domain/ports/form-generation-activities.port';

/**
 * The complete pipeline, seen from above.
 *
 *   RETRIEVING → (GENERATING → VALIDATING → REPAIRING)* → AWAITING_REVIEW
 *                                                       → APPROVED | REJECTED
 *                                                       └→ FAILED
 *
 * This file does nothing: it decides in which order things happen and what
 * happens when something goes wrong. All the substance is in the activities,
 * which run outside the sandbox and may touch the network and the database.
 *
 * What it does contribute — and cannot be obtained any other way — is
 * durability. The retry loop, the 30-day wait for a human signature and the
 * status of every request survive the pod restarting, being replaced or dying
 * halfway. Without this, waiting for review would be a row in a table and a
 * cron staring at it.
 */

const activities = proxyActivities<FormGenerationActivities>({
  startToCloseTimeout: generationPolicy.storeTimeout,
  retry: generationPolicy.activityRetry,
});

/**
 * The ones going out to the network get their own timeout. A single
 * `proxyActivities` for everything would force using the longest one
 * everywhere, and a hung Postgres write would be discovered five minutes late.
 */
const retrieval = proxyActivities<
  Pick<FormGenerationActivities, 'retrieveRegulatoryContext'>
>({
  startToCloseTimeout: generationPolicy.retrievalTimeout,
  retry: generationPolicy.activityRetry,
});

const generation = proxyActivities<
  Pick<FormGenerationActivities, 'requestFormDraft'>
>({
  startToCloseTimeout: generationPolicy.generationTimeout,
  retry: generationPolicy.activityRetry,
});

export const reviewSignal = defineSignal<[FormGenerationReviewSignal]>(
  formGenerationSignals.review,
);

/**
 * Entry point. The only thing it adds over `runGeneration` is the guarantee
 * that the request **never stays in an intermediate state**.
 *
 * Without this, any error the activities cannot retry — LiteLLM returning a 404
 * because the model was withdrawn, for instance — fails the workflow with the
 * row still in GENERATING. Temporal records it and it shows in its UI, but the
 * database never finds out: no status change, no `NOTIFY`, and the front waits
 * forever for progress that will never come. The person sees "Drafting…" until
 * they close the tab.
 */
export async function generateForm(
  input: GenerateFormWorkflowInput,
): Promise<FormGenerationStatus> {
  try {
    return await runGeneration(input);
  } catch (error) {
    // `nonCancellable` because this also has to run when what interrupted the
    // workflow was a cancellation: if the write is cancelled along with the
    // rest, the very notification that had to be given is lost.
    await CancellationScope.nonCancellable(() =>
      activities.failFormGeneration({
        formGenerationId: input.formGenerationId,
        reason: describeFailure(error),
      }),
    );

    // It is rethrown on purpose: the row already says FAILED for the front, and
    // the workflow has to end up as failed in Temporal so the complete error
    // stays where it gets investigated.
    throw error;
  }
}

/**
 * Unwraps the root cause of an error.
 *
 * Temporal wraps whatever an activity throws in an `ActivityFailure`, whose
 * message is always "Activity task failed" — useless for showing to somebody.
 * The real reason is a few levels down the `cause` chain.
 */
const describeFailure = (error: unknown): string => {
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current instanceof Error && current.cause && !seen.has(current)) {
    seen.add(current);
    current = current.cause;
  }

  if (current instanceof Error) {
    return current.message;
  }

  return typeof current === 'string' ? current : 'Unknown error';
};

async function runGeneration(
  input: GenerateFormWorkflowInput,
): Promise<FormGenerationStatus> {
  const { formGenerationId } = input;

  /**
   * The verdict goes inside an object and not in a loose `let` for a TypeScript
   * reason, not a Temporal one: the compiler does not follow assignments
   * happening inside a callback, so after the `condition` it would still
   * believe a `let` is `null`. Reading a property makes the narrowing work.
   */
  const pending: { review: FormGenerationReviewSignal | null } = {
    review: null,
  };

  // The handler is registered before the first wait. If a signal arrived before
  // the handler existed, Temporal would buffer it and deliver it on
  // registration — but registering early avoids depending on that.
  setHandler(reviewSignal, (review) => {
    pending.review = review;
  });

  await activities.markStatus({
    formGenerationId,
    status: formGenerationStatuses.retrieving,
  });

  const regulatoryContext = await retrieval.retrieveRegulatoryContext({
    prompt: input.prompt,
    documents: input.regulatoryDocuments,
  });

  const generated = await generateValidDraft({
    formGenerationId,
    prompt: input.prompt,
    regulatoryContext,
  });

  if (!generated.isValid) {
    await activities.failFormGeneration({
      formGenerationId,
      reason: `The model did not produce a valid form in ${generationPolicy.maxAttempts} attempts. Last problem: ${generated.problems[0] ?? 'unknown'}`,
    });

    return formGenerationStatuses.failed;
  }

  // Leaves the request in AWAITING_REVIEW. The AI never publishes on its own:
  // here the workflow halts until a person decides.
  await activities.saveGeneratedForm({
    formGenerationId,
    draft: generated.draft,
  });

  const wasReviewed = await condition(
    () => pending.review !== null,
    generationPolicy.reviewWindow,
  );

  const review = pending.review;

  if (!wasReviewed || !review) {
    await activities.failFormGeneration({
      formGenerationId,
      reason: `Nobody reviewed the form within ${generationPolicy.reviewWindow}.`,
    });

    return formGenerationStatuses.failed;
  }

  await activities.applyReview({
    formGenerationId,
    decision: review.decision,
    reviewerNote: review.reviewerNote,
  });

  log.info('Generation reviewed', {
    formGenerationId,
    decision: review.decision,
  });

  return review.decision === formGenerationReviewDecisions.approve
    ? formGenerationStatuses.approved
    : formGenerationStatuses.rejected;
}

type GenerateValidDraftInput = {
  formGenerationId: string;
  prompt: string;
  regulatoryContext: string;
};

/**
 * The repair loop.
 *
 * Every turn hands the model, in writing, what went wrong in the previous one.
 * That is what sets this apart from retrying blindly: a retry without the
 * errors inside asks exactly the same thing of the same model, and at a low
 * temperature it returns almost always the same invalid answer.
 *
 * It lives in the workflow and not in Temporal's retry policy because
 * Temporal's retry is for transport failures — it re-executes the same activity
 * with the same arguments. Here the arguments change.
 */
const generateValidDraft = async ({
  formGenerationId,
  prompt,
  regulatoryContext,
}: GenerateValidDraftInput) => {
  let problems: string[] = [];

  for (let attempt = 1; attempt <= generationPolicy.maxAttempts; attempt += 1) {
    await activities.markStatus({
      formGenerationId,
      // The first attempt generates; the following ones repair. They are
      // different statuses because to whoever is watching the screen they mean
      // different things: "this is taking a while" vs. "this is having
      // trouble".
      status:
        attempt === 1
          ? formGenerationStatuses.generating
          : formGenerationStatuses.repairing,
      attempts: attempt,
    });

    const raw = await generation.requestFormDraft({
      prompt,
      regulatoryContext,
      problems,
    });

    await activities.markStatus({
      formGenerationId,
      status: formGenerationStatuses.validating,
      attempts: attempt,
    });

    const validation = await activities.validateFormDraft({ raw });

    if (validation.isValid) {
      return validation;
    }

    problems = validation.problems;

    log.warn('The generated form did not validate', {
      formGenerationId,
      attempt,
      problems,
    });
  }

  return { isValid: false as const, problems };
};
