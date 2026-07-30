import type { FormValues } from '../types/form-template';

/**
 * Strips empty values before submitting: the backend distinguishes between
 * "not answered" (absent) and "answered empty".
 */
export const normalizeFormValues = (values: FormValues): FormValues =>
  Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  );
