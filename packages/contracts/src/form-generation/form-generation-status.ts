import { Type, type Static } from '@sinclair/typebox';

/**
 * Estados del pipeline de generación de un formulario.
 *
 * El orden de la declaración es el orden real del recorrido, y cada estado
 * responde a «¿qué está esperando ahora mismo esta solicitud?». Por eso hay
 * más de los cuatro del boceto original: un estado que agrupa dos esperas
 * distintas no le sirve ni al que mira la UI ni al que mira Temporal.
 *
 * Objeto `as const` en vez de `enum` (`CLAUDE.md` §2): ni el worker depende del
 * enum que genera Prisma, ni el front repite los literales para mapear estado →
 * variante visual.
 */
export const formGenerationStatuses = {
  /** La escribió el back al aceptar el POST. Temporal todavía no la tomó. */
  pending: 'PENDING',
  /** Buscando contexto en RAGFlow para los documentos elegidos. */
  retrieving: 'RETRIEVING',
  /** El LLM está redactando el formulario. */
  generating: 'GENERATING',
  /** Contrastando lo que devolvió el LLM contra el schema del paquete. */
  validating: 'VALIDATING',
  /** No validó: se le devuelven los errores al LLM y se reintenta. */
  repairing: 'REPAIRING',
  /**
   * Hay un formulario válido y el workflow está detenido esperando a una
   * persona. **Toda** generación pasa por acá: la IA nunca publica sola.
   */
  awaitingReview: 'AWAITING_REVIEW',
  /** Una persona lo aprobó. Terminal. */
  approved: 'APPROVED',
  /** Una persona lo rechazó. Terminal. */
  rejected: 'REJECTED',
  /** Se agotaron los reintentos o algo se rompió sin arreglo. Terminal. */
  failed: 'FAILED',
} as const;

export const formGenerationStatusSchema = /* @__PURE__ */ Type.Enum(
  formGenerationStatuses,
  {
    $id: 'FormGenerationStatus',
    description: 'Estado del pipeline de generación del formulario.',
  },
);

export type FormGenerationStatus = Static<typeof formGenerationStatusSchema>;

/**
 * Estados donde ya no queda nada por esperar.
 *
 * Vive acá y no en cada app porque las tres lo necesitan para lo mismo con
 * distintas palabras: el front deja de escuchar el WebSocket, el back deja de
 * reintentar señales y el worker termina el workflow. Si mañana se agrega un
 * estado terminal, se agrega en una sola lista.
 */
export const terminalFormGenerationStatuses = [
  formGenerationStatuses.approved,
  formGenerationStatuses.rejected,
  formGenerationStatuses.failed,
] as const;

export const isTerminalFormGenerationStatus = (
  status: FormGenerationStatus,
): boolean =>
  (terminalFormGenerationStatuses as readonly FormGenerationStatus[]).includes(
    status,
  );

/** Decisión de la persona que revisa. No hay tercera opción a propósito. */
export const formGenerationReviewDecisions = {
  approve: 'APPROVE',
  reject: 'REJECT',
} as const;

export const formGenerationReviewDecisionSchema = /* @__PURE__ */ Type.Enum(
  formGenerationReviewDecisions,
  {
    $id: 'FormGenerationReviewDecision',
    description: 'Veredicto humano sobre un formulario generado.',
  },
);

export type FormGenerationReviewDecision = Static<
  typeof formGenerationReviewDecisionSchema
>;
