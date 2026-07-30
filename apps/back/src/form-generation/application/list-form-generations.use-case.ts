import type { FormGeneration } from '../domain/form-generation';
import type { FormGenerationRepository } from '../domain/ports/form-generation-repository.port';

/** List of requests, from the most recent to the oldest. */
export class ListFormGenerationsUseCase {
  constructor(private readonly formGenerations: FormGenerationRepository) {}

  execute(): Promise<FormGeneration[]> {
    return this.formGenerations.findAll();
  }
}
