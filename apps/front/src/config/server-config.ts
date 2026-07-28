/**
 * Configuración compartida entre el build tooling (vite.config.ts) y la app.
 * Vive fuera de `env.ts` porque debe ser importable desde Node, donde
 * `import.meta.env` no existe.
 */
export const DEV_SERVER_PORT = 3000;

export const MOCK_API_LATENCY_MS = 300;
