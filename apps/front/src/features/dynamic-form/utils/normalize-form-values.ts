import type { FormValues } from '../types/form-template';

/**
 * Quita valores vacíos antes de enviar: el backend distingue entre
 * "no respondido" (ausente) y "respondido vacío".
 */
export const normalizeFormValues = (values: FormValues): FormValues =>
  Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  );
