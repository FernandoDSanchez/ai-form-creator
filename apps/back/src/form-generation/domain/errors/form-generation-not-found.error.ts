/**
 * A request that does not exist was asked for.
 *
 * A domain error, not a `NotFoundException`: the core does not know which HTTP
 * code it deserves. That translation is done by
 * `infrastructure/http/domain-exception.filter.ts`.
 */
export class FormGenerationNotFoundError extends Error {
  constructor(readonly formGenerationId: string) {
    super(`Generation request ${formGenerationId} does not exist.`);
    this.name = 'FormGenerationNotFoundError';
  }
}
