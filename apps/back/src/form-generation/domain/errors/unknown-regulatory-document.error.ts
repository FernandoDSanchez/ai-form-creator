/**
 * The request references documents that are not in the database.
 *
 * It is checked before starting the workflow and not inside it: a made-up id is
 * a client error (400), not a pipeline failure. If it were let through, the
 * model would generate the form with less context than the user believes they
 * gave it, and nobody would find out.
 */
export class UnknownRegulatoryDocumentError extends Error {
  constructor(readonly missingIds: readonly string[]) {
    super(`These regulatory documents do not exist: ${missingIds.join(', ')}.`);
    this.name = 'UnknownRegulatoryDocumentError';
  }
}
