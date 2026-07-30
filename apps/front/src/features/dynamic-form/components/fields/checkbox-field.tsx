import { connect } from '@formily/react';

import { cn } from '@/utils/cn';

type CheckboxProps = {
  value?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  onChange?: (checked: boolean) => void;
};

/**
 * Formily derives the value from the event; on a checkbox the native
 * `event.target.value` is `"on"`, so we emit the boolean explicitly.
 */
const Checkbox = ({
  value = false,
  disabled,
  className,
  children,
  onChange,
}: CheckboxProps) => (
  <label
    className={cn(
      'text-content gap-sm flex cursor-pointer items-center text-sm',
      className,
    )}
  >
    <input
      type="checkbox"
      checked={value}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.checked)}
      className="accent-brand-600 size-4"
    />
    {children}
  </label>
);

export const CheckboxField = connect(Checkbox);
