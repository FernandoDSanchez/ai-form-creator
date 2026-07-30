import { Type, type Static } from '@sinclair/typebox';

/**
 * Statuses of a form generation pipeline.
 *
 * Declaration order is the real order of the journey, and every status answers
 * "what is this request waiting for right now?". That is why there are more
 * than the four of the original sketch: a status that lumps together two
 * different waits helps neither whoever is looking at the UI nor whoever is
 * looking at Temporal.
 *
 * An `as const` object instead of an `enum` (`CLAUDE.md` §2): the worker does
 * not depend on the enum Prisma generates, and the front does not repeat the
 * literals to map status → visual variant.
 */
export const formGenerationStatuses = {
  /** Written by the back when it accepted the POST. Temporal has not picked it up yet. */
  pending: 'PENDING',
  /** Looking for context in RAGFlow for the chosen documents. */
  retrieving: 'RETRIEVING',
  /** The LLM is drafting the form. */
  generating: 'GENERATING',
  /** Checking what the LLM returned against the package schema. */
  validating: 'VALIDATING',
  /** It did not validate: the errors go back to the LLM and it is retried. */
  repairing: 'REPAIRING',
  /**
   * There is a valid form and the workflow is halted, waiting for a person.
   * **Every** generation goes through here: the AI never publishes on its own.
   */
  awaitingReview: 'AWAITING_REVIEW',
  /** A person approved it. Terminal. */
  approved: 'APPROVED',
  /** A person rejected it. Terminal. */
  rejected: 'REJECTED',
  /** Retries ran out or something broke beyond repair. Terminal. */
  failed: 'FAILED',
} as const;

export const formGenerationStatusSchema = /* @__PURE__ */ Type.Enum(
  formGenerationStatuses,
  {
    $id: 'FormGenerationStatus',
    description: 'Status of the form generation pipeline.',
  },
);

export type FormGenerationStatus = Static<typeof formGenerationStatusSchema>;

/**
 * Statuses where there is nothing left to wait for.
 *
 * It lives here and not in each app because all three need it for the same
 * thing under different words: the front stops listening to the WebSocket, the
 * back stops retrying signals and the worker ends the workflow. If a new
 * terminal status shows up tomorrow, it is added to a single list.
 */
export const terminalFormGenerationStatuses = [
  formGenerationStatuses.approved,
  formGenerationStatuses.rejected,
  formGenerationStatuses.failed,
] as const;

export const isTerminalFormGenerationStatus = (
  status: FormGenerationStatus,
): boolean =>
  (terminalFormGenerationStatuses as readonly FormGenerationStatus[]).includes(
    status,
  );

/** The reviewer's decision. There is deliberately no third option. */
export const formGenerationReviewDecisions = {
  approve: 'APPROVE',
  reject: 'REJECT',
} as const;

export const formGenerationReviewDecisionSchema = /* @__PURE__ */ Type.Enum(
  formGenerationReviewDecisions,
  {
    $id: 'FormGenerationReviewDecision',
    description: 'Human verdict on a generated form.',
  },
);

export type FormGenerationReviewDecision = Static<
  typeof formGenerationReviewDecisionSchema
>;
