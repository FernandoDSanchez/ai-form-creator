import type {
  FormGenerationChange,
  FormGenerationChangeFeed,
} from '../domain/ports/form-generation-change-feed.port';
import type { FormGenerationPublisher } from '../domain/ports/form-generation-publisher.port';
import type { FormGenerationRepository } from '../domain/ports/form-generation-repository.port';

/**
 * The bridge between the two processes: what the worker writes into Postgres
 * goes out through the back's WebSocket.
 *
 * It is a use case and not an infrastructure service because the decision it
 * makes is a business one: **the database notification is not relayed as-is**.
 * The trigger sends id and status (all that fits into the 8 KB of
 * `pg_notify`), and here the row is re-read to publish the complete entity,
 * already mapped. The front always receives the same shape, whether it comes
 * from a GET or from an event.
 *
 * Re-reading also has a property the trigger payload cannot have: what gets
 * published is the **current** status, not the one at the time the notification
 * fired. If two changes arrive back to back, the second one wins, which is the
 * right answer — and there is no way to emit an old status on top of a new one.
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
      // The feed listener is synchronous (a Postgres socket event calls it) and
      // this is asynchronous. The error is chained by hand instead of leaving
      // the promise loose: an exception here cannot take the process down nor
      // end up in an `unhandledRejection`.
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

    // It may be gone if somebody deleted it between the notification and the
    // re-read. That is not an error: there is simply nothing to publish.
    if (formGeneration) {
      this.publisher.publish(formGeneration);
    }
  }
}
