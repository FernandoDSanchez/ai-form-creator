import type { RegulatoryDocument } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document';

/**
 * What this feature needs to know about a regulatory document in order to offer
 * it in the picker: what it is called and whether it is already indexed.
 *
 * It is declared here, derived from the contract, instead of importing the type
 * from `features/regulatory-documents/`. ESLint forbids the latter (§1), and
 * the ban is there precisely to force this question: what does one feature ask
 * of the other? The answer is three fields, and writing it as a `Pick` puts it
 * on the record — plus, if a contract field changes, this finds out.
 *
 * It is the same device the back uses with `RegulatoryDocumentCatalog`: when
 * two modules cannot look at each other, the one that needs something declares
 * the minimal projection and the one that composes passes it along. Here the
 * one composing is `src/app/routes/`.
 */
export type SelectableRegulatoryDocument = Pick<
  RegulatoryDocument,
  'id' | 'fileName' | 'status'
>;
