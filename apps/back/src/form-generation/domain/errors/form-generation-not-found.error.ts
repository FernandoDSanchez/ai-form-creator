/**
 * Se pidió una solicitud que no existe.
 *
 * Error de dominio, no `NotFoundException`: el núcleo no sabe qué código HTTP
 * le toca. Esa traducción la hace
 * `infrastructure/http/domain-exception.filter.ts`.
 */
export class FormGenerationNotFoundError extends Error {
  constructor(readonly formGenerationId: string) {
    super(`No existe la solicitud de generación ${formGenerationId}.`);
    this.name = 'FormGenerationNotFoundError';
  }
}
