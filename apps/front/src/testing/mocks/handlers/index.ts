import { formGenerationsHandlers } from './form-generations';
import { formTemplatesHandlers } from './form-templates';
import { regulatoryDocumentsHandlers } from './regulatory-documents';

export const handlers = [
  ...formTemplatesHandlers,
  ...regulatoryDocumentsHandlers,
  ...formGenerationsHandlers,
];
