/**
 * El tercer cable: el WebSocket por el que el back le avisa al front que una
 * generación cambió de estado.
 *
 * Mismo razonamiento que `form-generation-workflow.ts`: un nombre de evento que
 * no coincida entre el `emit` del gateway y el `on` del hook no rompe nada, sólo
 * deja al front esperando. Los nombres se declaran una vez.
 *
 * El canal es una sala de socket.io por solicitud, y no un broadcast general,
 * porque el payload trae el formulario entero: quien mira la generación A no
 * tiene por qué recibir la B.
 */

/** Namespace de socket.io: separa este canal de cualquier otro que se agregue. */
export const formGenerationNamespace = '/form-generations';

/**
 * Ruta del handshake de socket.io, **relativa a la raíz de la API**.
 *
 * Es el valor por omisión de socket.io, pero acá no se puede dejar por omisión:
 * los gateways de Nest no pasan por `setGlobalPrefix`, así que el servidor
 * atendería en `/socket.io` —la raíz del dominio— mientras el Ingress manda
 * todo lo que no empieza con `/api` al nginx del front. El handshake se comería
 * un 404 del front y el socket no conectaría nunca; la pantalla seguiría
 * andando por el polling de respaldo, que es justo lo que hace que el problema
 * pase desapercibido.
 *
 * Cada punta lo antepone con lo que le corresponde: el back con su
 * `globalPrefix`, el front con el path de su `API_URL`.
 */
export const formGenerationStreamPath = '/socket.io';

export const formGenerationEvents = {
  /** front → back: «quiero enterarme de esta solicitud». Payload: el id. */
  watch: 'watch',
  /** back → front: la solicitud cambió. Payload: la entidad entera. */
  changed: 'changed',
} as const;

/** Sala de socket.io de una solicitud. Una por id, sin cruces. */
export const formGenerationRoom = (formGenerationId: string): string =>
  `form-generation:${formGenerationId}`;

/**
 * Canal de `LISTEN`/`NOTIFY` de Postgres que dispara todo esto.
 *
 * Lo escribe el trigger de la migración `..._form_generation` y lo escucha el
 * adaptador `postgres-form-generation-change-feed.ts`. Que el nombre viva acá y
 * no en el back es discutible —el front no lo usa—, pero es el mismo literal
 * que aparece en un `.sql` que ESLint no mira, y prefiero tenerlo donde se lo
 * ve al lado del resto de la cadena.
 */
export const formGenerationChangeChannel = 'form_generation_changed';
