import type {
  FormGenerationReviewDecision,
  FormGenerationStatus,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';
import type { WorkflowRegulatoryDocument } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import type { GeneratedForm } from '@ai-form-creator/contracts/form-generation/generated-form';

/**
 * Everything the workflow needs from the world, declared as a type.
 *
 * It is the same pattern as the back's ports, and here it also solves a
 * concrete problem: the workflow cannot import `activities/` (ESLint blocks it,
 * and the sandbox would break it), but it needs the activity **types** so that
 * `proxyActivities` returns something typed. Declaring them in `domain/` leaves
 * the workflow depending on the interface and not on the implementation, which
 * is the right thing under both readings — the hexagonal one and Temporal's.
 *
 * Every input is an object and not a list of parameters: the arguments of an
 * activity travel serialised and get recorded in the history. An object with
 * names can be extended without breaking workflows already in flight; a
 * positional list cannot.
 */

export type MarkStatusInput = {
  formGenerationId: string;
  status: FormGenerationStatus;
  /** Written only if provided. Status and counter do not always advance together. */
  attempts?: number;
};

export type RetrieveRegulatoryContextInput = {
  /** The user's request, which is also the query to the RAG. */
  prompt: string;
  documents: WorkflowRegulatoryDocument[];
};

export type RequestFormDraftInput = {
  prompt: string;
  /** RAG chunks, already assembled as text. Empty if there were no documents. */
  regulatoryContext: string;
  /**
   * What went wrong in the previous attempt. Empty on the first one.
   *
   * This is what separates a retry from a useful retry: without it, asking the
   * same thing of the same model at the same temperature returns the same
   * error.
   */
  problems: string[];
};

export type FormDraftValidation =
  | { isValid: true; draft: GeneratedForm }
  | { isValid: false; problems: string[] };

export type SaveGeneratedFormInput = {
  formGenerationId: string;
  draft: GeneratedForm;
};

export type FailFormGenerationInput = {
  formGenerationId: string;
  reason: string;
};

export type ApplyReviewInput = {
  formGenerationId: string;
  decision: FormGenerationReviewDecision;
  reviewerNote: string;
};

export type FormGenerationActivities = {
  markStatus(input: MarkStatusInput): Promise<void>;

  /** Returns the relevant chunks as a single text for the prompt. */
  retrieveRegulatoryContext(
    input: RetrieveRegulatoryContextInput,
  ): Promise<string>;

  /** Returns the model's answer **raw**: a string claiming to be JSON. */
  requestFormDraft(input: RequestFormDraftInput): Promise<string>;

  /**
   * Validates against the package schema and against the rules the schema
   * cannot express.
   *
   * It is an activity and not a function called from the workflow, even though
   * it is pure and touches nothing outside. The reason is re-execution: the
   * workflow waits up to 30 days for a review, and during those 30 days new
   * code will be deployed. On re-execution, everything **inside** the workflow
   * runs again with the new version; if by then the schema changed and what
   * used to validate no longer does, the workflow would take a path different
   * from the one already recorded in the history and Temporal would kill it
   * with a non-determinism error. An activity result, by contrast, is recorded:
   * it is re-read, not recomputed.
   */
  validateFormDraft(input: { raw: string }): Promise<FormDraftValidation>;

  /**
   * Compiles the draft into Formily JSON and stores both, leaving the request
   * in AWAITING_REVIEW. A single activity so that no intermediate state exists
   * where there is a draft but no schema.
   */
  saveGeneratedForm(input: SaveGeneratedFormInput): Promise<void>;

  failFormGeneration(input: FailFormGenerationInput): Promise<void>;

  applyReview(input: ApplyReviewInput): Promise<void>;
};
