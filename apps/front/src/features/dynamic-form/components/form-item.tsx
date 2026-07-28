import type { Field } from '@formily/core';
import { observer, useField } from '@formily/react';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

type FormItemProps = {
  children?: ReactNode;
  /** Descripción opcional declarada en el schema (`x-decorator-props`). */
  help?: string;
  className?: string;
};

/**
 * Decorador de campo: label, marca de requerido, ayuda y errores.
 * Se declara en el schema como `x-decorator: 'FormItem'`.
 */
export const FormItem = observer(
  ({ children, help, className }: FormItemProps) => {
    const field = useField<Field>();
    const errors = field.selfErrors ?? [];
    const description = help ?? field.description;

    return (
      <div className={cn('gap-xs flex flex-col', className)}>
        {field.title ? (
          <label className="text-content text-sm font-medium">
            {field.title}
            {field.required ? (
              <span aria-hidden className="text-danger ml-2xs">
                *
              </span>
            ) : null}
          </label>
        ) : null}

        {children}

        {description ? (
          <p className="text-content-muted text-xs">{description}</p>
        ) : null}

        {errors.length > 0 ? (
          <p role="alert" className="text-danger text-xs">
            {errors.join(', ')}
          </p>
        ) : null}
      </div>
    );
  },
);
