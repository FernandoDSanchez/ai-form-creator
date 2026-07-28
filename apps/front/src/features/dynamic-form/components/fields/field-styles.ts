import { cva } from 'class-variance-authority';

/**
 * Estilos base compartidos por todos los controles del formulario.
 * Sólo tokens: nada de valores crudos.
 */
export const controlVariants = cva(
  'w-full rounded-md border bg-surface px-sm text-sm text-content transition-colors placeholder:text-content-muted disabled:cursor-not-allowed disabled:bg-surface-sunken',
  {
    variants: {
      invalid: {
        true: 'border-danger focus:border-danger',
        false: 'border-border focus:border-brand-500',
      },
      size: {
        md: 'h-10',
        lg: 'h-12',
        auto: 'min-h-24 py-sm',
      },
    },
    defaultVariants: {
      invalid: false,
      size: 'md',
    },
  },
);
