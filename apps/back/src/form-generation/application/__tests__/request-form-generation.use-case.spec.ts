import type { WorkflowRegulatoryDocument } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';

import { UnknownRegulatoryDocumentError } from '../../domain/errors/unknown-regulatory-document.error';
import type {
  FormGeneration,
  NewFormGeneration,
} from '../../domain/form-generation';
import { formGenerationStatuses } from '../../domain/form-generation-status';
import type { FormGenerationOrchestrator } from '../../domain/ports/form-generation-orchestrator.port';
import type { FormGenerationRepository } from '../../domain/ports/form-generation-repository.port';
import type { RegulatoryDocumentCatalog } from '../../domain/ports/regulatory-document-catalog.port';
import { RequestFormGenerationUseCase } from '../request-form-generation.use-case';

const FORM_GENERATION_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const DOCUMENT_ID = '3f1d9d2e-0b8a-4c5e-9f11-2a7b6c8d9e01';
const OTHER_DOCUMENT_ID = '8c2a4b6d-1e3f-4a70-9b25-5d8e0f1a2b34';
const EPOCH = new Date(0).toISOString();

const aDocument = (id: string): WorkflowRegulatoryDocument => ({
  id,
  ragflowDocumentId: 'b330ec2e91ec11efbc510242ac120004',
  ragflowDatasetId: '527fa74891e811ef9c650242ac120006',
});

const aRequest = (
  regulatoryDocumentIds: string[] = [DOCUMENT_ID],
): NewFormGeneration => ({
  prompt: 'Import declaration form with sanitary control.',
  regulatoryDocumentIds,
});

const aRepository = (): FormGenerationRepository => ({
  create: jest
    .fn()
    .mockImplementation((request: NewFormGeneration): Promise<FormGeneration> =>
      Promise.resolve({
        ...request,
        id: FORM_GENERATION_ID,
        status: formGenerationStatuses.pending,
        attempts: 0,
        draft: null,
        formilySchema: null,
        failureReason: null,
        reviewerNote: null,
        reviewedAt: null,
        createdAt: EPOCH,
        updatedAt: EPOCH,
      }),
    ),
  findById: jest.fn().mockResolvedValue(null),
  findAll: jest.fn().mockResolvedValue([]),
});

const aCatalog = (
  documents: WorkflowRegulatoryDocument[] = [aDocument(DOCUMENT_ID)],
): RegulatoryDocumentCatalog => ({
  findByIds: jest.fn().mockResolvedValue(documents),
});

const anOrchestrator = (): FormGenerationOrchestrator => ({
  start: jest.fn().mockResolvedValue(undefined),
  submitReview: jest.fn().mockResolvedValue(undefined),
});

describe('RequestFormGenerationUseCase', () => {
  it('writes the request and starts the workflow', async () => {
    const formGenerations = aRepository();
    const orchestrator = anOrchestrator();
    const useCase = new RequestFormGenerationUseCase(
      formGenerations,
      aCatalog(),
      orchestrator,
    );

    const result = await useCase.execute(aRequest());

    expect(result.status).toBe(formGenerationStatuses.pending);
    expect(formGenerations.create).toHaveBeenCalledWith(aRequest());
    expect(orchestrator.start).toHaveBeenCalledTimes(1);
  });

  it('passes the workflow the already resolved documents, not just the ids', async () => {
    // This is what lets the worker skip reading the database and keeps the
    // generation tied to the documents that existed at request time.
    const orchestrator = anOrchestrator();
    const useCase = new RequestFormGenerationUseCase(
      aRepository(),
      aCatalog(),
      orchestrator,
    );

    await useCase.execute(aRequest());

    expect(orchestrator.start).toHaveBeenCalledWith({
      formGenerationId: FORM_GENERATION_ID,
      prompt: aRequest().prompt,
      regulatoryDocuments: [aDocument(DOCUMENT_ID)],
    });
  });

  it('rejects the request if some document does not exist', async () => {
    const formGenerations = aRepository();
    const orchestrator = anOrchestrator();
    // The catalog returns only one of the two requested.
    const useCase = new RequestFormGenerationUseCase(
      formGenerations,
      aCatalog([aDocument(DOCUMENT_ID)]),
      orchestrator,
    );

    await expect(
      useCase.execute(aRequest([DOCUMENT_ID, OTHER_DOCUMENT_ID])),
    ).rejects.toBeInstanceOf(UnknownRegulatoryDocumentError);

    // What matters is not the error but what did NOT happen: no PENDING rows
    // pointing at non-existent documents.
    expect(formGenerations.create).not.toHaveBeenCalled();
    expect(orchestrator.start).not.toHaveBeenCalled();
  });

  it('accepts a request with no documents', async () => {
    const orchestrator = anOrchestrator();
    const useCase = new RequestFormGenerationUseCase(
      aRepository(),
      aCatalog([]),
      orchestrator,
    );

    await useCase.execute(aRequest([]));

    expect(orchestrator.start).toHaveBeenCalledWith(
      expect.objectContaining({ regulatoryDocuments: [] }),
    );
  });

  it('leaves the row written even if the orchestrator fails', async () => {
    // The synchronous phase already did its job: the request is recorded and
    // can be retried. Triggering before writing would lose it.
    const formGenerations = aRepository();
    const orchestrator: FormGenerationOrchestrator = {
      start: jest
        .fn()
        .mockRejectedValue(new Error('Temporal is not answering')),
      submitReview: jest.fn(),
    };

    const useCase = new RequestFormGenerationUseCase(
      formGenerations,
      aCatalog(),
      orchestrator,
    );

    await expect(useCase.execute(aRequest())).rejects.toThrow();
    expect(formGenerations.create).toHaveBeenCalledTimes(1);
  });
});
