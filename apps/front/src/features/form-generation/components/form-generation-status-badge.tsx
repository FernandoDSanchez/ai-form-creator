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
      // El estado cambia solo, sin que la persona haga nada. Sin esto, quien usa
      // un lector de pantalla se queda esperando en silencio.
      aria-live="polite"
    >
      {variant.label}
    </span>
  );
};
