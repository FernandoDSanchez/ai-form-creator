import type { FormGenerationStatus } from '../form-generation-status';

/** Lo que trae el aviso de Postgres: el id y el estado nuevo, nada más. */
export type FormGenerationChange = {
  formGenerationId: string;
  status: FormGenerationStatus;
};

/**
 * Puerto de **entrada** invertido: el mundo avisa que algo cambió.
 *
 * Hace falta porque quien mueve los estados es otro proceso (el worker), así
 * que el back no puede enterarse por sus propios casos de uso. El adaptador
 * actual es `LISTEN` de Postgres
 * (`infrastructure/persistence/postgres-form-generation-change-feed.ts`); podría
 * ser una cola sin que cambie nada del núcleo.
 *
 * Devuelve una función para desuscribirse: el que la llama es el que sabe
 * cuándo dejar de escuchar, y sin eso el shutdown deja callbacks colgando.
 */
export type FormGenerationChangeFeed = {
  onChange(listener: (change: FormGenerationChange) => void): () => void;
};

export const FORM_GENERATION_CHANGE_FEED = Symbol('FormGenerationChangeFeed');
