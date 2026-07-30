import type {
  FormGenerationChange,
  FormGenerationChangeFeed,
} from '../domain/ports/form-generation-change-feed.port';
import type { FormGenerationPublisher } from '../domain/ports/form-generation-publisher.port';
import type { FormGenerationRepository } from '../domain/ports/form-generation-repository.port';

/**
 * El puente entre los dos procesos: lo que el worker escribe en Postgres sale
 * por el WebSocket del back.
 *
 * Es un caso de uso y no un servicio de infraestructura porque la decisión que
 * toma es de negocio: **el aviso de la base no se retransmite tal cual**. El
 * trigger manda id y estado (todo lo que entra en los 8 KB de `pg_notify`), y
 * acá se relee la fila para publicar la entidad completa, ya mapeada. El front
 * recibe siempre la misma forma, venga de un GET o de un evento.
 *
 * Releer tiene además una propiedad que el payload del trigger no puede tener:
 * lo que se publica es el estado **actual**, no el que había cuando se disparó
 * la notificación. Si llegan dos cambios pegados, el segundo gana, que es lo
 * correcto — y no hay forma de emitir un estado viejo encima de uno nuevo.
 */
export class BroadcastFormGenerationChangesUseCase {
  private stopListening: (() => void) | null = null;

  constructor(
    private readonly formGenerations: FormGenerationRepository,
    private readonly changeFeed: FormGenerationChangeFeed,
    private readonly publisher: FormGenerationPublisher,
    private readonly onError: (error: unknown) => void,
  ) {}

  start(): void {
    this.stopListening = this.changeFeed.onChange((change) => {
      // El listener del feed es síncrono (lo llama un evento del socket de
      // Postgres) y esto es asíncrono. Se encadena el error a mano en vez de
      // dejar la promesa suelta: una excepción acá no puede tumbar el proceso
      // ni quedar en un `unhandledRejection`.
      this.publish(change).catch(this.onError);
    });
  }

  stop(): void {
    this.stopListening?.();
    this.stopListening = null;
  }

  private async publish(change: FormGenerationChange): Promise<void> {
    const formGeneration = await this.formGenerations.findById(
      change.formGenerationId,
    );

    // Puede no estar si alguien la borró entre el aviso y la relectura. No es
    // un error: simplemente no hay nada que publicar.
    if (formGeneration) {
      this.publisher.publish(formGeneration);
    }
  }
}
