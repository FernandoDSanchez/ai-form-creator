import type { RegulatoryDocument } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document';

/**
 * Lo que esta feature necesita saber de un documento regulatorio para poder
 * ofrecerlo en el selector: cómo se llama y si ya está indexado.
 *
 * Se declara acá, derivado del contrato, en vez de importar el tipo desde
 * `features/regulatory-documents/`. Eso último lo prohíbe ESLint (§1), y la
 * prohibición está justamente para forzar esta pregunta: ¿qué le pide una
 * feature a la otra? La respuesta son tres campos, y escribirla como un `Pick`
 * la deja anotada — además de que si al contrato le cambia un campo, esto se
 * entera.
 *
 * Es el mismo recurso que usa el back con `RegulatoryDocumentCatalog`: cuando
 * dos módulos no se pueden mirar, el que necesita declara la proyección mínima
 * y el que compone se la pasa. Acá el que compone es `src/app/routes/`.
 */
export type SelectableRegulatoryDocument = Pick<
  RegulatoryDocument,
  'id' | 'fileName' | 'status'
>;
