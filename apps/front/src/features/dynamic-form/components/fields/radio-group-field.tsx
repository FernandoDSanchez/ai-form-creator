import { connect, mapProps, useField } from '@formily/react';

import { cn } from '@/utils/cn';

import type { FieldOption } from './select-field';

type RadioGroupProps = {
  value?: string | number;
  options?: FieldOption[];
  disabled?: boolean;
  className?: string;
  onChange?: (value: string | number) => void;
};

const RadioGroup = ({
  value,
  options = [],
  disabled,
  className,
  onChange,
}: RadioGroupProps) => {
  const field = useField();
  const groupName = field.address.toString();

  return (
    <div role="radiogroup" className={cn('gap-sm flex flex-col', className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className="text-content gap-sm flex cursor-pointer items-center text-sm"
        >
          <input
            type="radio"
            name={groupName}
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange?.(option.value)}
            className="accent-brand-600 size-4"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
};

export const RadioGroupField = connect(
  RadioGroup,
  mapProps({ dataSource: 'options' }),
);
