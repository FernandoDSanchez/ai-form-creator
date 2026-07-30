import { UnknownRegulatoryDocumentError } from '../domain/errors/unknown-regulatory-document.error';
import type {
  FormGeneration,
  NewFormGeneration,
} from '../domain/form-generation';
import type { FormGenerationOrchestrator } from '../domain/ports/form-generation-orchestrator.port';
import type { FormGenerationRepository } from '../domain/ports/form-generation-repository.port';
import type { RegulatoryDocumentCatalog } from '../domain/ports/regulatory-document-catalog.port';

/**
 * Fase síncrona del pedido de generación.
 *
 * Clase pelada, sin `@Injectable()`: la aplicación no conoce Nest. El módulo la
 * instancia con un `useFactory` y su test se escribe con tres dobles.
 *
 * El orden es deliberado:
 *
 *   1. **Resolver los documentos primero.** Es la única validación que necesita
 *      la base, y hacerla antes de escribir evita dejar filas PENDING que
 *      referencian documentos inexistentes.
 *   2. **Después la fila.** Nace en PENDING y con `attempts` en 0.
 *   3. **Y recién ahí el disparo.** Si Temporal no responde, la fila ya existe
 *      y el error se traduce a 502: el pedido está registrado y se puede
 *      reintentar, en vez de perderse.
 *
 * Si se hiciera al revés —disparar y después escribir— el worker podría llegar
 * a la primera actividad antes de que exista la fila que tiene que actualizar.
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

    // El workflow recibe los documentos ya resueltos: no vuelve a leer la base.
    // Ver `generateFormWorkflowInputSchema` en el paquete de contratos.
    await this.orchestrator.start({
      formGenerationId: formGeneration.id,
      prompt: formGeneration.prompt,
      regulatoryDocuments: documents,
    });

    return formGeneration;
  }
}
