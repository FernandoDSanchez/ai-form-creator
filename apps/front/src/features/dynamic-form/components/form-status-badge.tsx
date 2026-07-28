import { cn } from '@/utils/cn';

import { formStatusVariants } from '../config/form-status';
import type { FormTemplateStatus } from '../types/form-template';

type FormStatusBadgeProps = {
  status: FormTemplateStatus;
  className?: string;
};

export const FormStatusBadge = ({
  status,
  className,
}: FormStatusBadgeProps) => {
  const variant = formStatusVariants[status];

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
