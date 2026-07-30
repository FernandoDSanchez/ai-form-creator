import type {
  NewRegulatoryDocument,
  RegulatoryDocument,
} from '../regulatory-document';

/**
 * Puerto de salida hacia el almacén de documentos.
 * Adaptador actual: `infrastructure/persistence/prisma-regulatory-document.repository.ts`.
 */
export type RegulatoryDocumentRepository = {
  create(document: NewRegulatoryDocument): Promise<RegulatoryDocument>;
  findAll(): Promise<RegulatoryDocument[]>;
};

/**
 * Token de inyección. El puerto es un `type` (no existe en runtime), así que
 * Nest necesita un símbolo para resolverlo. Se declara junto al puerto para
 * que agregar un puerto sea tocar un solo archivo.
 */
export const REGULATORY_DOCUMENT_REPOSITORY = Symbol(
  'RegulatoryDocumentRepository',
);
