import {
  formTemplateStatuses,
  type FormTemplateStatus,
} from '../types/form-template';

/**
 * Variant Mapping: estado -> presentación.
 * Sin `if/else`, sin comparar contra strings: se indexa el mapa.
 * Al ser `Record<FormTemplateStatus, ...>`, TypeScript obliga a cubrir todos
 * los estados cuando se añade uno nuevo.
 */
export const formStatusVariants: Record<
  FormTemplateStatus,
  { label: string; className: string; isSubmittable: boolean }
> = {
  [formTemplateStatuses.draft]: {
    label: 'Borrador',
    className: 'bg-warning-surface text-warning border-warning',
    isSubmittable: false,
  },
  [formTemplateStatuses.published]: {
    label: 'Publicado',
    className: 'bg-success-surface text-success border-success',
    isSubmittable: true,
  },
  [formTemplateStatuses.archived]: {
    label: 'Archivado',
    className: 'bg-surface-sunken text-content-muted border-border',
    isSubmittable: false,
  },
};
