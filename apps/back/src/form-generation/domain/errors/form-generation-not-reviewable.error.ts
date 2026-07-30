import type { FormGenerationStatus } from '../form-generation-status';

/**
 * Se quiso aprobar o rechazar algo que todavía no está para revisar (o que ya
 * se revisó).
 *
 * Es la regla que sostiene «la IA nunca publica sola»: la única transición
 * hacia APPROVED sale de AWAITING_REVIEW y la dispara una persona. Vive en el
 * dominio, no en el controlador, porque no es una validación de la petición
 * sino la regla del negocio.
 */
export class FormGenerationNotReviewableError extends Error {
  constructor(
    readonly formGenerationId: string,
    readonly status: FormGenerationStatus,
  ) {
    super(
      `La solicitud ${formGenerationId} está en ${status} y sólo se puede ` +
        'revisar lo que está esperando revisión.',
    );
    this.name = 'FormGenerationNotReviewableError';
  }
}
