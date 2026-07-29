import {
  regulatoryDocumentStatuses,
  type RegulatoryDocumentStatus,
} from '../types/regulatory-document';

/**
 * Variant Mapping: estado -> presentación. Sin `if/else` y sin comparar contra
 * strings sueltos, se indexa el mapa.
 *
 * Lo interesante es de dónde salen las claves: `RegulatoryDocumentStatus` es el
 * tipo del contrato compartido, así que el día que el back agregue un estado al
 * pipeline, este `Record` deja de compilar hasta que alguien decida cómo se
 * pinta. Es el chequeo que antes no existía cuando los estados se repetían a
 * mano en cada app.
 */
export const regulatoryDocumentStatusVariants: Record<
  RegulatoryDocumentStatus,
  { label: string; className: string; isProcessing: boolean }
> = {
  [regulatoryDocumentStatuses.pending]: {
    label: 'En cola',
    className: 'bg-surface-sunken text-content-muted border-border',
    isProcessing: true,
  },
  [regulatoryDocumentStatuses.processing]: {
    label: 'Procesando',
    className: 'bg-info-surface text-info border-info',
    isProcessing: true,
  },
  [regulatoryDocumentStatuses.indexed]: {
    label: 'Indexado',
    className: 'bg-success-surface text-success border-success',
    isProcessing: false,
  },
  [regulatoryDocumentStatuses.failed]: {
    label: 'Falló',
    className: 'bg-danger-surface text-danger border-danger',
    isProcessing: false,
  },
};
