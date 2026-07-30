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
  prompt: 'Formulario de declaración de importación.',
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

/** Feed controlable: el test dispara los avisos a mano. */
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
  // El aviso trae el estado, pero es sólo una pista: lo que se publica sale de
  // releer la fila.
  status: formGenerationStatuses.generating,
});

/** Deja que corra la microtarea que el listener encadenó. */
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

  it('relee la fila y publica la entidad completa, no el payload del aviso', async () => {
    // El trigger sólo puede mandar id y estado: el payload de `pg_notify` tiene
    // un tope de 8 KB y el schema de Formily lo pasa.
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

  it('no publica nada si la fila ya no está', async () => {
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

  it('reporta el error sin dejar la promesa suelta', async () => {
    // El listener del feed es síncrono (lo llama un evento del socket de
    // Postgres): una excepción que se escape acá termina en
    // `unhandledRejection`, que con la config por defecto de Node tumba el pod.
    const onError = jest.fn();
    const changes = aChangeFeed();
    const broken: FormGenerationRepository = {
      create: jest.fn(),
      findById: jest.fn().mockRejectedValue(new Error('base caída')),
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

  it('se desuscribe al parar', () => {
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
