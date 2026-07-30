import type {
  FormGenerationReviewDecision,
  FormGenerationStatus,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';
import type { WorkflowRegulatoryDocument } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import type { GeneratedForm } from '@ai-form-creator/contracts/form-generation/generated-form';

/**
 * Todo lo que el workflow necesita del mundo, declarado como un tipo.
 *
 * Es el mismo patrón que los puertos del back, y acá además resuelve un
 * problema concreto: el workflow no puede importar `activities/` (ESLint lo
 * bloquea, y el sandbox lo rompería), pero necesita los **tipos** de las
 * actividades para que `proxyActivities` devuelva algo tipado. Declararlos en
 * `domain/` deja al workflow dependiendo de la interfaz y no de la
 * implementación, que es lo que corresponde en las dos lecturas —la hexagonal
 * y la de Temporal—.
 *
 * Cada input es un objeto y no una lista de parámetros: los argumentos de una
 * actividad viajan serializados y quedan grabados en el historial. Un objeto
 * con nombres se puede extender sin romper los workflows que ya están en vuelo;
 * una lista posicional, no.
 */

export type MarkStatusInput = {
  formGenerationId: string;
  status: FormGenerationStatus;
  /** Se escribe sólo si viene. El estado y el contador no siempre avanzan juntos. */
  attempts?: number;
};

export type RetrieveRegulatoryContextInput = {
  /** El pedido del usuario, que es también la consulta al RAG. */
  prompt: string;
  documents: WorkflowRegulatoryDocument[];
};

export type RequestFormDraftInput = {
  prompt: string;
  /** Fragmentos del RAG, ya armados como texto. Vacío si no hubo documentos. */
  regulatoryContext: string;
  /**
   * Qué estuvo mal en el intento anterior. Vacío en el primero.
   *
   * Es lo que separa un reintento de un reintento útil: sin esto, pedirle lo
   * mismo al mismo modelo con la misma temperatura devuelve el mismo error.
   */
  problems: string[];
};

export type FormDraftValidation =
  | { isValid: true; draft: GeneratedForm }
  | { isValid: false; problems: string[] };

export type SaveGeneratedFormInput = {
  formGenerationId: string;
  draft: GeneratedForm;
};

export type FailFormGenerationInput = {
  formGenerationId: string;
  reason: string;
};

export type ApplyReviewInput = {
  formGenerationId: string;
  decision: FormGenerationReviewDecision;
  reviewerNote: string;
};

export type FormGenerationActivities = {
  markStatus(input: MarkStatusInput): Promise<void>;

  /** Devuelve los fragmentos relevantes como un solo texto para el prompt. */
  retrieveRegulatoryContext(
    input: RetrieveRegulatoryContextInput,
  ): Promise<string>;

  /** Devuelve la respuesta del modelo **cruda**: un string que dice ser JSON. */
  requestFormDraft(input: RequestFormDraftInput): Promise<string>;

  /**
   * Valida contra el schema del paquete y contra las reglas que el schema no
   * puede expresar.
   *
   * Es una actividad y no una función llamada desde el workflow, aunque sea
   * pura y no toque nada de afuera. El motivo es la reejecución: el workflow se
   * queda hasta 30 días esperando revisión, y durante esos 30 días se va a
   * desplegar código nuevo. Al reejecutarse, todo lo que esté **en** el
   * workflow corre otra vez con la versión nueva; si para entonces el schema
   * cambió y lo que antes validaba ahora no, el workflow tomaría un camino
   * distinto al que ya está grabado en el historial y Temporal lo mataría con
   * un error de no-determinismo. El resultado de una actividad, en cambio,
   * queda grabado: se relee, no se recalcula.
   */
  validateFormDraft(input: { raw: string }): Promise<FormDraftValidation>;

  /**
   * Compila el borrador a JSON de Formily y guarda las dos cosas, dejando la
   * solicitud en AWAITING_REVIEW. Una sola actividad para que no exista un
   * estado intermedio donde hay borrador pero no schema.
   */
  saveGeneratedForm(input: SaveGeneratedFormInput): Promise<void>;

  failFormGeneration(input: FailFormGenerationInput): Promise<void>;

  applyReview(input: ApplyReviewInput): Promise<void>;
};
