import { FormGenerationNotFoundError } from '../domain/errors/form-generation-not-found.error';
import type { FormGeneration } from '../domain/form-generation';
import type { FormGenerationRepository } from '../domain/ports/form-generation-repository.port';

/**
 * Reads a request by id.
 *
 * The front uses it twice: when opening the screen (initial state) and as a
 * safety net while the WebSocket is not connected. That is why the repository's
 * `null` becomes an error here and does not leak upwards: the caller gets the
 * entity or an exception, never a `null` they have to remember to check.
 */
export class GetFormGenerationUseCase {
  constructor(private readonly formGenerations: FormGenerationRepository) {}

  async execute(formGenerationId: string): Promise<FormGeneration> {
    const formGeneration =
      await this.formGenerations.findById(formGenerationId);

    if (!formGeneration) {
      throw new FormGenerationNotFoundError(formGenerationId);
    }

    return formGeneration;
  }
}
