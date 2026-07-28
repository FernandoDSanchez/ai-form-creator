import { connect, mapProps } from '@formily/react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

import { controlVariants } from './field-styles';

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> & {
  value?: string;
  invalid?: boolean;
};

const TextInput = ({ value, invalid, className, ...props }: TextInputProps) => (
  <input
    type="text"
    value={value ?? ''}
    className={cn(controlVariants({ invalid }), className)}
    {...props}
  />
);

/**
 * `connect` enlaza el componente con el `field` de Formily:
 * inyecta `value`, `onChange`, `disabled`... `mapProps` traduce estado del
 * field a props del componente.
 */
export const TextField = connect(
  TextInput,
  mapProps((props, field) => ({
    ...props,
    invalid: Boolean('selfErrors' in field && field.selfErrors?.length),
  })),
);
