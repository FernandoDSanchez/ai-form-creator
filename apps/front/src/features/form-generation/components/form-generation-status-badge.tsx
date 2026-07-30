import { cn } from '@/utils/cn';

import { formGenerationStatusVariants } from '../config/form-generation-status';
import type { FormGenerationStatus } from '../types/form-generation';

type FormGenerationStatusBadgeProps = {
  status: FormGenerationStatus;
  className?: string;
};

export const FormGenerationStatusBadge = ({
  status,
  className,
}: FormGenerationStatusBadgeProps) => {
  const variant = formGenerationStatusVariants[status];

  return (
    <span
      className={cn(
        'rounded-pill px-sm py-2xs inline-flex items-center border text-xs font-medium',
        variant.className,
        className,
      )}
      // The status changes on its own, without the person doing anything.
      // Without this, whoever uses a screen reader waits in silence.
      aria-live="polite"
    >
      {variant.label}
    </span>
  );
};
