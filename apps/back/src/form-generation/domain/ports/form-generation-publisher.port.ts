import type { FormGeneration } from '../form-generation';

/**
 * Outbound port to tell the world that a request changed.
 *
 * The name says neither "WebSocket" nor "socket.io" (`CLAUDE.md` §9): the core
 * publishes, and where that goes out is decided by the module. Today a
 * socket.io gateway covers it; tomorrow it could be SSE without touching the
 * use case.
 *
 * It returns `void` and not a promise on purpose: publishing is best-effort. If
 * nobody is listening to that request, nothing happened — the status is in the
 * database and the front recovers it with a GET.
 */
export type FormGenerationPublisher = {
  publish(formGeneration: FormGeneration): void;
};

export const FORM_GENERATION_PUBLISHER = Symbol('FormGenerationPublisher');
