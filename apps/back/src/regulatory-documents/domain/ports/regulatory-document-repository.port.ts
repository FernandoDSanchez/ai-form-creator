import type {
  NewRegulatoryDocument,
  RegulatoryDocument,
} from '../regulatory-document';

/**
 * Outbound port towards the document store.
 * Current adapter: `infrastructure/persistence/prisma-regulatory-document.repository.ts`.
 */
export type RegulatoryDocumentRepository = {
  create(document: NewRegulatoryDocument): Promise<RegulatoryDocument>;
  findAll(): Promise<RegulatoryDocument[]>;
};

/**
 * Injection token. The port is a `type` (it does not exist at runtime), so Nest
 * needs a symbol to resolve it. It is declared next to the port so that adding
 * a port means touching a single file.
 */
export const REGULATORY_DOCUMENT_REPOSITORY = Symbol(
  'RegulatoryDocumentRepository',
);
