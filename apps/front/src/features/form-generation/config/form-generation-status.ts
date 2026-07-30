import {
  formGenerationStatuses,
  type FormGenerationStatus,
} from '../types/form-generation';

/**
 * Variant Mapping: estado → presentación. Sin `if/else` y sin comparar contra
 * strings sueltos, se indexa el mapa (`CLAUDE.md` §5).
 *
 * Las claves salen del tipo del contrato compartido, así que el día que el
 * pipeline gane un estado, este `Record` deja de compilar hasta que alguien
 * decida cómo se pinta y qué le dice a la persona que está esperando.
 *
 * `isBusy` es lo que hace que la pantalla se explique sola: distingue «esto
 * sigue avanzando, quedate» de «esto terminó, mirá el resultado».
 */
export const formGenerationStatusVariants: Record<
  FormGenerationStatus,
  { label: string; description: string; className: string; isBusy: boolean }
> = {
  [formGenerationStatuses.pending]: {
    label: 'En cola',
    description: 'La solicitud entró. Falta que el orquestador la tome.',
    className: 'bg-surface-sunken text-content-muted border-border',
    isBusy: true,
  },
  [formGenerationStatuses.retrieving]: {
    label: 'Buscando normas',
    description: 'Recuperando los fragmentos de los documentos elegidos.',
    className: 'bg-info-surface text-info border-info',
    isBusy: true,
  },
  [formGenerationStatuses.generating]: {
    label: 'Redactando',
    description: 'El modelo está armando el formulario.',
    className: 'bg-info-surface text-info border-info',
    isBusy: true,
  },
  [formGenerationStatuses.validating]: {
    label: 'Validando',
    description: 'Contrastando lo generado contra el vocabulario permitido.',
    className: 'bg-info-surface text-info border-info',
    isBusy: true,
  },
  [formGenerationStatuses.repairing]: {
    label: 'Corrigiendo',
    description: 'No validó: se le devolvieron los errores al modelo.',
    className: 'bg-warning-surface text-warning border-warning',
    isBusy: true,
  },
  [formGenerationStatuses.awaitingReview]: {
    label: 'Esperando revisión',
    description: 'Hay un formulario válido. Falta que una persona lo apruebe.',
    className: 'bg-brand-50 text-brand-700 border-brand-200',
    isBusy: false,
  },
  [formGenerationStatuses.approved]: {
    label: 'Aprobado',
    description: 'Revisado y aprobado por una persona.',
    className: 'bg-success-surface text-success border-success',
    isBusy: false,
  },
  [formGenerationStatuses.rejected]: {
    label: 'Rechazado',
    description: 'Revisado y descartado por una persona.',
    className: 'bg-surface-sunken text-content-muted border-border-strong',
    isBusy: false,
  },
  [formGenerationStatuses.failed]: {
    label: 'Falló',
    description: 'El pipeline no pudo terminar.',
    className: 'bg-danger-surface text-danger border-danger',
    isBusy: false,
  },
};

/**
 * El recorrido feliz, para dibujar el avance.
 *
 * Es una lista aparte y no `Object.keys` del mapa de arriba porque los estados
 * terminales no son pasos: APPROVED, REJECTED y FAILED son cómo termina, no por
 * dónde pasa. REPAIRING tampoco aparece — es un rulo sobre GENERATING, y
 * mostrarlo como paso propio haría que la barra pareciera retroceder.
 */
export const formGenerationProgressSteps = [
  formGenerationStatuses.pending,
  formGenerationStatuses.retrieving,
  formGenerationStatuses.generating,
  formGenerationStatuses.validating,
  formGenerationStatuses.awaitingReview,
] as const;
