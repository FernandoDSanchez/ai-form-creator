/**
 * The third wire: the WebSocket the back uses to tell the front that a
 * generation changed status.
 *
 * Same reasoning as `form-generation-workflow.ts`: an event name that does not
 * match between the gateway's `emit` and the hook's `on` breaks nothing, it
 * just leaves the front waiting. The names are declared once.
 *
 * The channel is a socket.io room per request, not a general broadcast, because
 * the payload carries the whole form: whoever is watching generation A has no
 * business receiving B.
 */

/** socket.io namespace: keeps this channel apart from any other one added later. */
export const formGenerationNamespace = '/form-generations';

/**
 * Path of the socket.io handshake, **relative to the API root**.
 *
 * It is socket.io's default value, but it cannot be left to default here: Nest
 * gateways do not go through `setGlobalPrefix`, so the server would listen on
 * `/socket.io` — the domain root — while the Ingress sends everything not
 * starting with `/api` to the front's nginx. The handshake would eat a 404 from
 * the front and the socket would never connect; the screen would keep working
 * through the fallback polling, which is exactly what makes the problem go
 * unnoticed.
 *
 * Each end prefixes it with what corresponds to it: the back with its
 * `globalPrefix`, the front with the path of its `API_URL`.
 */
export const formGenerationStreamPath = '/socket.io';

export const formGenerationEvents = {
  /** front → back: "I want to hear about this request". Payload: the id. */
  watch: 'watch',
  /** back → front: the request changed. Payload: the whole entity. */
  changed: 'changed',
} as const;

/** socket.io room of a request. One per id, no crossing over. */
export const formGenerationRoom = (formGenerationId: string): string =>
  `form-generation:${formGenerationId}`;

/**
 * The Postgres `LISTEN`/`NOTIFY` channel that sets all of this off.
 *
 * It is written by the trigger of the `..._form_generation` migration and
 * listened to by the `postgres-form-generation-change-feed.ts` adapter. Whether
 * the name belongs here rather than in the back is debatable — the front does
 * not use it — but it is the same literal appearing in a `.sql` file ESLint
 * never looks at, and I would rather have it where it can be seen next to the
 * rest of the chain.
 */
export const formGenerationChangeChannel = 'form_generation_changed';
