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
  prompt: 'Formulario de declaración de importación.',
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
  reviewerNote: 'Cubre lo que pide la resolución.',
});

describe('ReviewFormGenerationUseCase', () => {
  it('le acerca el veredicto al workflow', async () => {
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

  it('no escribe el estado: de eso se encarga el worker', async () => {
    // Que el puerto del repositorio no tenga un `update` es la regla escrita en
    // el tipo; este test es la regla escrita en el comportamiento.
    const formGenerations = aRepository(
      aFormGeneration(formGenerationStatuses.awaitingReview),
    );

    await new ReviewFormGenerationUseCase(
      formGenerations,
      anOrchestrator(),
    ).execute(FORM_GENERATION_ID, aReview());

    expect(formGenerations.create).not.toHaveBeenCalled();
  });

  it('falla si la solicitud no existe', async () => {
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
  ])('rechaza revisar algo en %s', async (status) => {
    // Sostiene la regla del sistema: la única transición hacia APPROVED sale de
    // AWAITING_REVIEW. Aprobar dos veces, o aprobar algo que todavía se está
    // generando, no son operaciones que existan.
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
