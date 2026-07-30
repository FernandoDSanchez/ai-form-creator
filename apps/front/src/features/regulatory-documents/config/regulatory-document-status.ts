import {
  regulatoryDocumentStatuses,
  type RegulatoryDocumentStatus,
} from '../types/regulatory-document';

/**
 * Variant Mapping: status -> presentation. No `if/else` and no comparing
 * against loose strings, the map is indexed.
 *
 * The interesting part is where the keys come from: `RegulatoryDocumentStatus`
 * is the shared contract type, so the day the back adds a status to the
 * pipeline, this `Record` stops compiling until somebody decides how it is
 * painted. It is the check that did not exist back when the statuses were
 * repeated by hand in every app.
 */
export const regulatoryDocumentStatusVariants: Record<
  RegulatoryDocumentStatus,
  { label: string; className: string; isProcessing: boolean }
> = {
  [regulatoryDocumentStatuses.pending]: {
    label: 'Queued',
    className: 'bg-surface-sunken text-content-muted border-border',
    isProcessing: true,
  },
  [regulatoryDocumentStatuses.processing]: {
    label: 'Processing',
    className: 'bg-info-surface text-info border-info',
    isProcessing: true,
  },
  [regulatoryDocumentStatuses.indexed]: {
    label: 'Indexed',
    className: 'bg-success-surface text-success border-success',
    isProcessing: false,
  },
  [regulatoryDocumentStatuses.failed]: {
    label: 'Failed',
    className: 'bg-danger-surface text-danger border-danger',
    isProcessing: false,
  },
};
