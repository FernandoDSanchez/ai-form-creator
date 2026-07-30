import { FormGenerationNotFoundError } from '../domain/errors/form-generation-not-found.error';
import { FormGenerationNotReviewableError } from '../domain/errors/form-generation-not-reviewable.error';
import type { FormGenerationReview } from '../domain/form-generation';
import { formGenerationStatuses } from '../domain/form-generation-status';
import type { FormGenerationOrchestrator } from '../domain/ports/form-generation-orchestrator.port';
import type { FormGenerationRepository } from '../domain/ports/form-generation-repository.port';

/**
 * El veredicto humano.
 *
 * No escribe el estado: se lo manda como señal al workflow, que está detenido
 * esperándola, y es él quien escribe APPROVED o REJECTED. Podría parecer una
 * vuelta larga —el back tiene la conexión a la base ahí nomás— pero es lo que
 * mantiene un solo dueño de los estados. Si el back escribiera acá y el worker
 * escribiera en el resto del pipeline, habría dos procesos compitiendo por la
 * misma fila y ninguna forma de saber cuál llegó último.
 *
 * El chequeo de AWAITING_REVIEW es la regla del negocio, no una validación de
 * la petición: es lo que sostiene que la IA no publique sola. Se hace igual
 * aunque el workflow rechazaría la señal por su cuenta, porque un `condition`
 * ignorando una señal se ve como «no pasó nada», y acá tiene que verse como un
 * 409.
 */
export class ReviewFormGenerationUseCase {
  constructor(
    private readonly formGenerations: FormGenerationRepository,
    private readonly orchestrator: FormGenerationOrchestrator,
  ) {}

  async execute(
    formGenerationId: string,
    review: FormGenerationReview,
  ): Promise<void> {
    const formGeneration =
      await this.formGenerations.findById(formGenerationId);

    if (!formGeneration) {
      throw new FormGenerationNotFoundError(formGenerationId);
    }

    if (formGeneration.status !== formGenerationStatuses.awaitingReview) {
      throw new FormGenerationNotReviewableError(
        formGenerationId,
        formGeneration.status,
      );
    }

    await this.orchestrator.submitReview(formGenerationId, review);
  }
}
