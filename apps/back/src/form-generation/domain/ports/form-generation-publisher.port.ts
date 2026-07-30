import type { FormGeneration } from '../form-generation';

/**
 * Puerto de salida para avisarle al mundo que una solicitud cambió.
 *
 * El nombre no dice «WebSocket» ni «socket.io» (`CLAUDE.md` §9): el núcleo
 * publica, y por dónde sale lo decide el módulo. Hoy lo tapa un gateway de
 * socket.io; mañana podría ser SSE sin tocar el caso de uso.
 *
 * Devuelve `void` y no una promesa a propósito: publicar es best-effort. Si no
 * hay nadie escuchando esa solicitud, no pasó nada — el estado está en la base
 * y el front lo recupera con un GET.
 */
export type FormGenerationPublisher = {
  publish(formGeneration: FormGeneration): void;
};

export const FORM_GENERATION_PUBLISHER = Symbol('FormGenerationPublisher');
