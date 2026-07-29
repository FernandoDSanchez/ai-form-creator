import { cn } from '@/utils/cn';

import { regulatoryDocumentStatusVariants } from '../config/regulatory-document-status';
import type { RegulatoryDocumentStatus } from '../types/regulatory-document';

type RegulatoryDocumentStatusBadgeProps = {
  status: RegulatoryDocumentStatus;
  className?: string;
};

export const RegulatoryDocumentStatusBadge = ({
  status,
  className,
}: RegulatoryDocumentStatusBadgeProps) => {
  const variant = regulatoryDocumentStatusVariants[status];

  return (
    <span
      className={cn(
        'rounded-pill px-sm py-2xs inline-flex items-center border text-xs font-medium',
        variant.className,
        className,
      )}
    >
      {variant.label}
    </span>
  );
};
