import {
  formTemplateStatuses,
  type FormTemplateStatus,
} from '../types/form-template';

/**
 * Variant Mapping: status -> presentation.
 * No `if/else`, no comparing against strings: the map is indexed.
 * Being a `Record<FormTemplateStatus, ...>`, TypeScript forces covering every
 * status when a new one is added.
 */
export const formStatusVariants: Record<
  FormTemplateStatus,
  { label: string; className: string; isSubmittable: boolean }
> = {
  [formTemplateStatuses.draft]: {
    label: 'Draft',
    className: 'bg-warning-surface text-warning border-warning',
    isSubmittable: false,
  },
  [formTemplateStatuses.published]: {
    label: 'Published',
    className: 'bg-success-surface text-success border-success',
    isSubmittable: true,
  },
  [formTemplateStatuses.archived]: {
    label: 'Archived',
    className: 'bg-surface-sunken text-content-muted border-border',
    isSubmittable: false,
  },
};
