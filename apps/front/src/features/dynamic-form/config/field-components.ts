/**
 * Configuración Centralizada + Variant Mapping.
 *
 * Estos son los nombres que el backend puede usar en `x-component` dentro del
 * JSON Schema. Son el contrato entre el schema (datos) y los componentes React.
 * Nunca escribas `'TextField'` a mano: importa la constante.
 */
export const fieldComponentNames = {
  text: 'TextField',
  textarea: 'TextareaField',
  number: 'NumberField',
  select: 'SelectField',
  checkbox: 'CheckboxField',
  radioGroup: 'RadioGroupField',
  date: 'DateField',
} as const;

export type FieldComponentName =
  (typeof fieldComponentNames)[keyof typeof fieldComponentNames];

/** Decorador (wrapper con label + error) aplicado a cada campo. */
export const fieldDecoratorNames = {
  formItem: 'FormItem',
} as const;
