/**
 * Configuración centralizada de la aplicación: nombres, timeouts, límites.
 * Regla: si un valor estático aparece en más de un sitio, o si es un "número
 * mágico" dentro de un componente, vive aquí.
 */
export const appConfig = {
  name: 'AI Form Creator',
  description: 'Crea y publica formularios dinámicos generados por IA.',
  locale: 'es-VE',
} as const;

export const httpConfig = {
  /** Timeout de cualquier petición HTTP. */
  requestTimeoutMs: 15_000,
  defaultHeaders: {
    accept: 'application/json',
  },
} as const;

export const queryConfigValues = {
  /** Cuánto tiempo se consideran frescos los datos cacheados. */
  staleTimeMs: 60_000,
  retryCount: 0,
} as const;

export const uiConfig = {
  /** Duración de un toast antes de auto-cerrarse. */
  notificationTimeoutMs: 5_000,
  /** Debounce estándar de inputs que disparan side effects. */
  inputDebounceMs: 300,
} as const;

/** Códigos HTTP usados en la app. Evita comparar contra números mágicos. */
export const httpStatus = {
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  unprocessableEntity: 422,
} as const;
