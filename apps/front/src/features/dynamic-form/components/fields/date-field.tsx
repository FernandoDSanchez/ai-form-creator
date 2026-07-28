import { connect, mapProps } from '@formily/react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

import { controlVariants } from './field-styles';

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> & {
  value?: string;
  invalid?: boolean;
};

const DateInput = ({ value, invalid, className, ...props }: DateInputProps) => (
  <input
    type="date"
    value={value ?? ''}
    className={cn(controlVariants({ invalid }), className)}
    {...props}
  />
);

export const DateField = connect(
  DateInput,
  mapProps((props, field) => ({
    ...props,
    invalid: Boolean('selfErrors' in field && field.selfErrors?.length),
  })),
);
