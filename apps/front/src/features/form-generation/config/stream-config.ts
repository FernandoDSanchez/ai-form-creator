import {
  formGenerationNamespace,
  formGenerationStreamPath,
} from '@ai-form-creator/contracts/form-generation/form-generation-event';

import { env } from '@/config/env';

/**
 * De dónde y cuándo escuchar los cambios de estado.
 *
 * Todo sale de `API_URL` en vez de pedir variables de entorno nuevas: el
 * WebSocket lo sirve el mismo proceso que la API, y dos variables que tienen
 * que apuntar al mismo lado son dos variables que en algún despliegue no lo van
 * a hacer. `URL` con base cubre tanto un `API_URL` absoluto
 * (`https://api.ejemplo.com/api`) como el relativo que usa el cluster (`/api`).
 *
 * El origen y el path se separan porque socket.io los pide separados: el
 * primero es a qué servidor conectarse, el segundo dónde vive el handshake. Ese
 * path tiene que quedar **debajo del prefijo de la API**, porque el Ingress
 * manda todo lo que no empieza con `/api` al nginx del front.
 */
const apiUrl = new URL(env.API_URL, window.location.origin);

/** `/api/` → `/api`. Sin esto quedaría `/api//socket.io`. */
const apiBasePath = apiUrl.pathname.replace(/\/$/, '');

export const formGenerationStream = {
  url: `${apiUrl.origin}${formGenerationNamespace}`,
  path: `${apiBasePath}${formGenerationStreamPath}`,

  /**
   * Con la API mockeada no hay socket que abrir: MSW intercepta peticiones
   * HTTP, no WebSockets. Si igual se intentara, en los tests el handshake de
   * socket.io aparecería como petición sin handler y MSW la haría fallar
   * (`onUnhandledRequest: 'error'`).
   *
   * El default cuando la variable no está es **conectar**: producción es el
   * caso sin mocks, y es preferible que un olvido deje el socket intentando a
   * que lo deje apagado sin que nadie lo note.
   */
  isEnabled: env.ENABLE_API_MOCKING !== true,
} as const;

export const formGenerationPolling = {
  /**
   * Red de seguridad mientras la solicitud sigue avanzando.
   *
   * No es la vía principal —para eso está el WebSocket— sino lo que sostiene la
   * pantalla si el socket no llegó a conectar, si se cayó, o si la API está
   * mockeada. Holgado a propósito: si el socket anda, este intervalo casi nunca
   * llega a dispararse.
   */
  intervalMs: 5_000,
} as const;
