import { Type, type Static } from '@sinclair/typebox';

/**
 * Los `x-component` que un schema de Formily puede pedir.
 *
 * Es el contrato de tres puntas del renderizado:
 *   - el front mapea cada nombre a un componente React
 *     (`features/dynamic-form/components/schema-field.tsx`),
 *   - el LLM sólo puede elegir de esta lista (viaja en el structured output),
 *   - el worker la usa para compilar el borrador a JSON de Formily.
 *
 * Vivía en `apps/front/src/features/dynamic-form/config/field-components.ts`.
 * Se subió acá cuando la IA pasó a ser quien elige el componente: desde
 * entonces son literales que cruzan el cable, y un componente nuevo que no se
 * agregue en las dos puntas es un formulario que no renderiza.
 */
export const formFieldComponents = {
  text: 'TextField',
  textarea: 'TextareaField',
  number: 'NumberField',
  select: 'SelectField',
  checkbox: 'CheckboxField',
  radioGroup: 'RadioGroupField',
  date: 'DateField',
} as const;

export const formFieldComponentSchema = /* @__PURE__ */ Type.Enum(
  formFieldComponents,
  {
    $id: 'FormFieldComponent',
    description: 'Componente que renderiza el campo (`x-component`).',
  },
);

export type FormFieldComponent = Static<typeof formFieldComponentSchema>;

/** Decorador (envoltorio con label + error) que se aplica a cada campo. */
export const formFieldDecorators = {
  formItem: 'FormItem',
} as const;

/**
 * Tipo JSON que le corresponde al valor de cada componente.
 *
 * Formily necesita el `type` del campo además del `x-component`, y quien lo
 * decide no es la IA: se deduce del componente. Que sea un `Record` sobre el
 * tipo del enum obliga a decidirlo al agregar un componente nuevo.
 */
export const formFieldValueTypes: Record<
  FormFieldComponent,
  'string' | 'number' | 'boolean'
> = {
  [formFieldComponents.text]: 'string',
  [formFieldComponents.textarea]: 'string',
  [formFieldComponents.number]: 'number',
  [formFieldComponents.select]: 'string',
  [formFieldComponents.checkbox]: 'boolean',
  [formFieldComponents.radioGroup]: 'string',
  [formFieldComponents.date]: 'string',
};

/**
 * Componentes que se alimentan de una lista cerrada de opciones.
 *
 * El structured output no puede expresar «`options` es obligatorio sólo si
 * `component` es SelectField» (JSON Schema no tiene condicionales que los
 * proveedores respeten en modo `strict`), así que la regla se verifica después,
 * en el workflow, y el error se le devuelve al LLM como texto.
 */
export const optionBackedFormFieldComponents: readonly FormFieldComponent[] = [
  formFieldComponents.select,
  formFieldComponents.radioGroup,
];
