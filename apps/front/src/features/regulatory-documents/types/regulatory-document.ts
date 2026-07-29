import type { RegulatoryDocument } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document';

/**
 * Tipos de la feature. La entidad no se declara acá: viene de
 * `@ai-form-creator/contracts`, el mismo schema TypeBox que usa el dominio del
 * back. Este archivo es sólo la puerta de la feature, igual que
 * `domain/regulatory-document.ts` del lado del back.
 *
 * Se reexporta el tipo y no el schema a propósito: los `Static<>` se borran al
 * compilar, mientras que importar el schema traería TypeBox al bundle sin que
 * el front lo necesite para nada.
 */
export type {
  RegulatoryDocument,
  NewRegulatoryDocument,
} from '@ai-form-creator/contracts/regulatory-documents/regulatory-document';

export {
  regulatoryDocumentStatuses,
  type RegulatoryDocumentStatus,
} from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';

/**
 * Lo que devuelve `POST /regulatory-documents` con su 202.
 *
 * No es la entidad entera: el back expone una vista más chica (ver
 * `infrastructure/http/dto/regulatory-document.response.ts`), sin `mimeType`
 * —que el cliente ya conoce, lo acaba de subir— ni `updatedAt` —que en el alta
 * siempre es igual a `createdAt`—.
 *
 * Se deriva con `Omit` en vez de escribirse a mano: si al contrato le cambia
 * un campo, esto se entera. Si algún día el back publica más endpoints de
 * documentos, conviene subir esta forma al paquete y borrar el `Omit`.
 */
export type AcceptedRegulatoryDocument = Omit<
  RegulatoryDocument,
  'mimeType' | 'updatedAt'
>;
