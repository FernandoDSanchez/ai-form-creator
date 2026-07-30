import { FormGenerationNotFoundError } from '../domain/errors/form-generation-not-found.error';
import type { FormGeneration } from '../domain/form-generation';
import type { FormGenerationRepository } from '../domain/ports/form-generation-repository.port';

/**
 * Lee una solicitud por id.
 *
 * El front lo usa dos veces: al abrir la pantalla (estado inicial) y como red
 * de seguridad mientras el WebSocket no esté conectado. Por eso el `null` del
 * repositorio se vuelve error acá y no se filtra hacia arriba: el que llama
 * recibe la entidad o una excepción, nunca un `null` que haya que recordar
 * chequear.
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
