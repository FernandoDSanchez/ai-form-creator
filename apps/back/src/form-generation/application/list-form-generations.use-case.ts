import type { FormGeneration } from '../domain/form-generation';
import type { FormGenerationRepository } from '../domain/ports/form-generation-repository.port';

/** Listado de solicitudes, de la más reciente a la más vieja. */
export class ListFormGenerationsUseCase {
  constructor(private readonly formGenerations: FormGenerationRepository) {}

  execute(): Promise<FormGeneration[]> {
    return this.formGenerations.findAll();
  }
}
