import { connect, mapProps } from '@formily/react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

import { controlVariants } from './field-styles';

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> & {
  value?: number;
  invalid?: boolean;
  onChange?: (value: number | undefined) => void;
};

const NumberInput = ({
  value,
  invalid,
  className,
  onChange,
  ...props
}: NumberInputProps) => (
  <input
    type="number"
    value={value ?? ''}
    onChange={(event) =>
      onChange?.(
        event.target.value === '' ? undefined : Number(event.target.value),
      )
    }
    className={cn(controlVariants({ invalid }), className)}
    {...props}
  />
);

export const NumberField = connect(
  NumberInput,
  mapProps((props, field) => ({
    ...props,
    invalid: Boolean('selfErrors' in field && field.selfErrors?.length),
  })),
);
