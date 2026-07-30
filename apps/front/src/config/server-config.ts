/**
 * Configuration shared between the build tooling (vite.config.ts) and the app.
 * It lives outside `env.ts` because it has to be importable from Node, where
 * `import.meta.env` does not exist.
 */
export const DEV_SERVER_PORT = 3000;

export const MOCK_API_LATENCY_MS = 300;
