import {
  formGenerationNamespace,
  formGenerationStreamPath,
} from '@ai-form-creator/contracts/form-generation/form-generation-event';

import { env } from '@/config/env';

/**
 * Where and when to listen for status changes.
 *
 * Everything comes from `API_URL` instead of asking for new environment
 * variables: the WebSocket is served by the same process as the API, and two
 * variables that have to point at the same place are two variables that in some
 * deployment will not. `URL` with a base covers both an absolute `API_URL`
 * (`https://api.example.com/api`) and the relative one the cluster uses
 * (`/api`).
 *
 * The origin and the path are kept apart because socket.io asks for them apart:
 * the first is which server to connect to, the second is where the handshake
 * lives. That path has to stay **below the API prefix**, because the Ingress
 * sends everything not starting with `/api` to the front's nginx.
 */
const apiUrl = new URL(env.API_URL, window.location.origin);

/** `/api/` → `/api`. Without this it would end up as `/api//socket.io`. */
const apiBasePath = apiUrl.pathname.replace(/\/$/, '');

export const formGenerationStream = {
  url: `${apiUrl.origin}${formGenerationNamespace}`,
  path: `${apiBasePath}${formGenerationStreamPath}`,

  /**
   * With the API mocked there is no socket to open: MSW intercepts HTTP
   * requests, not WebSockets. If it were attempted anyway, in the tests the
   * socket.io handshake would show up as a request with no handler and MSW
   * would make it fail (`onUnhandledRequest: 'error'`).
   *
   * The default when the variable is absent is to **connect**: production is
   * the case without mocks, and it is preferable for an oversight to leave the
   * socket retrying than to leave it off without anybody noticing.
   */
  isEnabled: env.ENABLE_API_MOCKING !== true,
} as const;

export const formGenerationPolling = {
  /**
   * Safety net while the request keeps moving forward.
   *
   * It is not the main path — the WebSocket is — but what holds the screen up
   * if the socket never managed to connect, if it went down, or if the API is
   * mocked. Loose on purpose: if the socket works, this interval almost never
   * gets to fire.
   */
  intervalMs: 5_000,
} as const;
