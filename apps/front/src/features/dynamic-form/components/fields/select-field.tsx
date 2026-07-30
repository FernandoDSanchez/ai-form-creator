import { connect, mapProps } from '@formily/react';
import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

import { controlVariants } from './field-styles';

export type FieldOption = {
  label: string;
  value: string | number;
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value'> & {
  value?: string | number;
  options?: FieldOption[];
  placeholder?: string;
  invalid?: boolean;
};

const Select = ({
  value,
  options = [],
  placeholder = 'Select an option',
  invalid,
  className,
  ...props
}: SelectProps) => (
  <select
    value={value ?? ''}
    className={cn(controlVariants({ invalid }), className)}
    {...props}
  >
    <option value="" disabled>
      {placeholder}
    </option>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

/**
 * `mapProps({ dataSource: 'options' })` takes the `enum` from the JSON Schema
 * (Formily exposes it as `field.dataSource`) and passes it as the `options`
 * prop.
 */
export const SelectField = connect(
  Select,
  mapProps({ dataSource: 'options' }, (props, field) => ({
    ...props,
    invalid: Boolean('selfErrors' in field && field.selfErrors?.length),
  })),
);
