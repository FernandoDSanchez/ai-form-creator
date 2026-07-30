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
 * `connect` binds the component to Formily's `field`: it injects `value`,
 * `onChange`, `disabled`… `mapProps` translates field state into component
 * props.
 */
export const TextField = connect(
  TextInput,
  mapProps((props, field) => ({
    ...props,
    invalid: Boolean('selfErrors' in field && field.selfErrors?.length),
  })),
);
