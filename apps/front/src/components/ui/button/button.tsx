import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

import { Spinner } from '../spinner/spinner';

/**
 * Variant Mapping con CVA: las variantes son datos, no `if/else`.
 * Todas las clases usan design tokens (`bg-brand-600`, `p-md`, `rounded-md`).
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-sm rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-600 text-content-inverse hover:bg-brand-700 active:bg-brand-800',
        secondary:
          'bg-surface text-content border border-border hover:bg-surface-sunken',
        ghost: 'text-content hover:bg-surface-sunken',
        danger: 'bg-danger text-content-inverse hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-sm text-sm',
        md: 'h-10 px-md text-sm',
        lg: 'h-12 px-lg text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean;
  };

export const Button = ({
  className,
  variant,
  size,
  fullWidth,
  isLoading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || isLoading}
    className={cn(buttonVariants({ variant, size, fullWidth }), className)}
    {...props}
  >
    {isLoading ? <Spinner size="sm" /> : null}
    {children}
  </button>
);
