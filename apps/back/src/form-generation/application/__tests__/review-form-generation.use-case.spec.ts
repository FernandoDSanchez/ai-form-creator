import { FormGenerationNotFoundError } from '../../domain/errors/form-generation-not-found.error';
import { FormGenerationNotReviewableError } from '../../domain/errors/form-generation-not-reviewable.error';
import type { FormGeneration } from '../../domain/form-generation';
import {
  formGenerationReviewDecisions,
  formGenerationStatuses,
  type FormGenerationStatus,
} from '../../domain/form-generation-status';
import type { FormGenerationOrchestrator } from '../../domain/ports/form-generation-orchestrator.port';
import type { FormGenerationRepository } from '../../domain/ports/form-generation-repository.port';
import { ReviewFormGenerationUseCase } from '../review-form-generation.use-case';

const FORM_GENERATION_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const EPOCH = new Date(0).toISOString();

const aFormGeneration = (status: FormGenerationStatus): FormGeneration => ({
  id: FORM_GENERATION_ID,
  prompt: 'Import declaration form.',
  regulatoryDocumentIds: [],
  status,
  attempts: 1,
  draft: null,
  formilySchema: null,
  failureReason: null,
  reviewerNote: null,
  reviewedAt: null,
  createdAt: EPOCH,
  updatedAt: EPOCH,
});

const aRepository = (
  formGeneration: FormGeneration | null,
): FormGenerationRepository => ({
  create: jest.fn(),
  findById: jest.fn().mockResolvedValue(formGeneration),
  findAll: jest.fn().mockResolvedValue([]),
});

const anOrchestrator = (): FormGenerationOrchestrator => ({
  start: jest.fn().mockResolvedValue(undefined),
  submitReview: jest.fn().mockResolvedValue(undefined),
});

const aReview = () => ({
  decision: formGenerationReviewDecisions.approve,
  reviewerNote: 'It covers what the regulation asks for.',
});

describe('ReviewFormGenerationUseCase', () => {
  it('hands the verdict over to the workflow', async () => {
    const orchestrator = anOrchestrator();
    const useCase = new ReviewFormGenerationUseCase(
      aRepository(aFormGeneration(formGenerationStatuses.awaitingReview)),
      orchestrator,
    );

    await useCase.execute(FORM_GENERATION_ID, aReview());

    expect(orchestrator.submitReview).toHaveBeenCalledWith(
      FORM_GENERATION_ID,
      aReview(),
    );
  });

  it('does not write the status: the worker takes care of that', async () => {
    // That the repository port has no `update` is the rule written into the
    // type; this test is the rule written into the behaviour.
    const formGenerations = aRepository(
      aFormGeneration(formGenerationStatuses.awaitingReview),
    );

    await new ReviewFormGenerationUseCase(
      formGenerations,
      anOrchestrator(),
    ).execute(FORM_GENERATION_ID, aReview());

    expect(formGenerations.create).not.toHaveBeenCalled();
  });

  it('fails if the request does not exist', async () => {
    const useCase = new ReviewFormGenerationUseCase(
      aRepository(null),
      anOrchestrator(),
    );

    await expect(
      useCase.execute(FORM_GENERATION_ID, aReview()),
    ).rejects.toBeInstanceOf(FormGenerationNotFoundError);
  });

  it.each([
    formGenerationStatuses.pending,
    formGenerationStatuses.generating,
    formGenerationStatuses.approved,
    formGenerationStatuses.failed,
  ])('refuses to review something in %s', async (status) => {
    // Upholds the rule of the system: the only transition towards APPROVED
    // starts at AWAITING_REVIEW. Approving twice, or approving something still
    // being generated, are not operations that exist.
    const orchestrator = anOrchestrator();
    const useCase = new ReviewFormGenerationUseCase(
      aRepository(aFormGeneration(status)),
      orchestrator,
    );

    await expect(
      useCase.execute(FORM_GENERATION_ID, aReview()),
    ).rejects.toBeInstanceOf(FormGenerationNotReviewableError);

    expect(orchestrator.submitReview).not.toHaveBeenCalled();
  });
});
