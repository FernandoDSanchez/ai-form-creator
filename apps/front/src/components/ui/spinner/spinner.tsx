import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/cn';

const spinnerVariants = cva('animate-spin text-brand-600', {
  variants: {
    size: {
      sm: 'size-4',
      md: 'size-6',
      lg: 'size-8',
      xl: 'size-12',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type SpinnerProps = VariantProps<typeof spinnerVariants> & {
  className?: string;
  label?: string;
};

export const Spinner = ({
  size,
  className,
  label = 'Cargando',
}: SpinnerProps) => (
  <svg
    role="status"
    aria-label={label}
    viewBox="0 0 24 24"
    fill="none"
    className={cn(spinnerVariants({ size }), className)}
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);
