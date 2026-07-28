import { connect, mapProps } from '@formily/react';
import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

import { controlVariants } from './field-styles';

type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value'
> & {
  value?: string;
  invalid?: boolean;
};

const Textarea = ({ value, invalid, className, ...props }: TextareaProps) => (
  <textarea
    value={value ?? ''}
    className={cn(controlVariants({ invalid, size: 'auto' }), className)}
    {...props}
  />
);

export const TextareaField = connect(
  Textarea,
  mapProps((props, field) => ({
    ...props,
    invalid: Boolean('selfErrors' in field && field.selfErrors?.length),
  })),
);
