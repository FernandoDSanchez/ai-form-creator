import type { FormGeneration } from '../../domain/form-generation';
import { formGenerationStatuses } from '../../domain/form-generation-status';
import type {
  FormGenerationChange,
  FormGenerationChangeFeed,
} from '../../domain/ports/form-generation-change-feed.port';
import type { FormGenerationPublisher } from '../../domain/ports/form-generation-publisher.port';
import type { FormGenerationRepository } from '../../domain/ports/form-generation-repository.port';
import { BroadcastFormGenerationChangesUseCase } from '../broadcast-form-generation-changes.use-case';

const FORM_GENERATION_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const EPOCH = new Date(0).toISOString();

const aFormGeneration = (): FormGeneration => ({
  id: FORM_GENERATION_ID,
  prompt: 'Import declaration form.',
  regulatoryDocumentIds: [],
  status: formGenerationStatuses.awaitingReview,
  attempts: 1,
  draft: null,
  formilySchema: null,
  failureReason: null,
  reviewerNote: null,
  reviewedAt: null,
  createdAt: EPOCH,
  updatedAt: EPOCH,
});

/** A controllable feed: the test fires the notifications by hand. */
const aChangeFeed = () => {
  const listeners: ((change: FormGenerationChange) => void)[] = [];

  const feed: FormGenerationChangeFeed = {
    onChange: (listener) => {
      listeners.push(listener);

      return () => {
        listeners.splice(listeners.indexOf(listener), 1);
      };
    },
  };

  return {
    feed,
    emit: (change: FormGenerationChange) =>
      listeners.forEach((listener) => listener(change)),
    get listenerCount() {
      return listeners.length;
    },
  };
};

const aChange = (): FormGenerationChange => ({
  formGenerationId: FORM_GENERATION_ID,
  // The notification carries the status, but it is only a hint: what gets
  // published comes from re-reading the row.
  status: formGenerationStatuses.generating,
});

/** Lets the microtask the listener chained actually run. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('BroadcastFormGenerationChangesUseCase', () => {
  const aRepository = (
    formGeneration: FormGeneration | null = aFormGeneration(),
  ): FormGenerationRepository => ({
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(formGeneration),
    findAll: jest.fn(),
  });

  const aPublisher = (): FormGenerationPublisher => ({ publish: jest.fn() });

  it('re-reads the row and publishes the whole entity, not the notification payload', async () => {
    // The trigger can only send id and status: the `pg_notify` payload is
    // capped at 8 KB and the Formily schema goes over it.
    const publisher = aPublisher();
    const changes = aChangeFeed();

    new BroadcastFormGenerationChangesUseCase(
      aRepository(),
      changes.feed,
      publisher,
      jest.fn(),
    ).start();

    changes.emit(aChange());
    await flush();

    expect(publisher.publish).toHaveBeenCalledWith(aFormGeneration());
  });

  it('publishes nothing if the row is gone', async () => {
    const publisher = aPublisher();
    const changes = aChangeFeed();

    new BroadcastFormGenerationChangesUseCase(
      aRepository(null),
      changes.feed,
      publisher,
      jest.fn(),
    ).start();

    changes.emit(aChange());
    await flush();

    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('reports the error without leaving the promise loose', async () => {
    // The feed listener is synchronous (a Postgres socket event calls it): an
    // exception escaping here ends up in `unhandledRejection`, which with
    // Node's default config takes the pod down.
    const onError = jest.fn();
    const changes = aChangeFeed();
    const broken: FormGenerationRepository = {
      create: jest.fn(),
      findById: jest.fn().mockRejectedValue(new Error('database down')),
      findAll: jest.fn(),
    };

    new BroadcastFormGenerationChangesUseCase(
      broken,
      changes.feed,
      aPublisher(),
      onError,
    ).start();

    changes.emit(aChange());
    await flush();

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes when stopped', () => {
    const changes = aChangeFeed();
    const useCase = new BroadcastFormGenerationChangesUseCase(
      aRepository(),
      changes.feed,
      aPublisher(),
      jest.fn(),
    );

    useCase.start();
    expect(changes.listenerCount).toBe(1);

    useCase.stop();
    expect(changes.listenerCount).toBe(0);
  });
});
