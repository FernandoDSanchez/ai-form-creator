import { UnknownRegulatoryDocumentError } from '../domain/errors/unknown-regulatory-document.error';
import type {
  FormGeneration,
  NewFormGeneration,
} from '../domain/form-generation';
import type { FormGenerationOrchestrator } from '../domain/ports/form-generation-orchestrator.port';
import type { FormGenerationRepository } from '../domain/ports/form-generation-repository.port';
import type { RegulatoryDocumentCatalog } from '../domain/ports/regulatory-document-catalog.port';

/**
 * Synchronous phase of the generation request.
 *
 * A bare class, with no `@Injectable()`: the application does not know Nest. The
 * module instantiates it with a `useFactory` and its test is written with three
 * doubles.
 *
 * The order is deliberate:
 *
 *   1. **Resolve the documents first.** It is the only validation needing the
 *      database, and doing it before writing avoids leaving PENDING rows
 *      referencing non-existent documents.
 *   2. **Then the row.** It is born as PENDING and with `attempts` at 0.
 *   3. **And only then the trigger.** If Temporal does not answer, the row
 *      already exists and the error translates into a 502: the request is
 *      recorded and can be retried, instead of being lost.
 *
 * Done the other way around — trigger first, write after — the worker could
 * reach the first activity before the row it has to update exists.
 */
export class RequestFormGenerationUseCase {
  constructor(
    private readonly formGenerations: FormGenerationRepository,
    private readonly regulatoryDocuments: RegulatoryDocumentCatalog,
    private readonly orchestrator: FormGenerationOrchestrator,
  ) {}

  async execute(request: NewFormGeneration): Promise<FormGeneration> {
    const documents = await this.regulatoryDocuments.findByIds(
      request.regulatoryDocumentIds,
    );

    const found = new Set(documents.map((document) => document.id));
    const missing = request.regulatoryDocumentIds.filter(
      (documentId) => !found.has(documentId),
    );

    if (missing.length > 0) {
      throw new UnknownRegulatoryDocumentError(missing);
    }

    const formGeneration = await this.formGenerations.create(request);

    // The workflow receives the documents already resolved: it does not read
    // the database again. See `generateFormWorkflowInputSchema` in the
    // contracts package.
    await this.orchestrator.start({
      formGenerationId: formGeneration.id,
      prompt: formGeneration.prompt,
      regulatoryDocuments: documents,
    });

    return formGeneration;
  }
}
