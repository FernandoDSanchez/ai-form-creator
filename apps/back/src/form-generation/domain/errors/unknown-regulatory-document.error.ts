/**
 * El pedido referencia documentos que no están en la base.
 *
 * Se chequea antes de arrancar el workflow y no dentro: un id inventado es un
 * error del cliente (400), no una falla del pipeline. Si se dejara pasar, el
 * modelo generaría el formulario con menos contexto del que el usuario cree que
 * le dio, y nadie se enteraría.
 */
export class UnknownRegulatoryDocumentError extends Error {
  constructor(readonly missingIds: readonly string[]) {
    super(`No existen los documentos regulatorios: ${missingIds.join(', ')}.`);
    this.name = 'UnknownRegulatoryDocumentError';
  }
}
