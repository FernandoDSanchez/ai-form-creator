import {
  formFieldDecorators,
  formFieldValueTypes,
} from '@ai-form-creator/contracts/form-generation/form-field-component';
import type {
  FormilyFieldSchema,
  FormilyFormSchema,
} from '@ai-form-creator/contracts/form-generation/formily-form-schema';
import type {
  GeneratedForm,
  GeneratedFormField,
} from '@ai-form-creator/contracts/form-generation/generated-form';

/**
 * Compila el borrador validado a JSON de Formily.
 *
 * Todo lo mecánico del formato vive acá y no en el prompt: el `type` del valor,
 * el decorador, dónde va el `placeholder`, dónde va la ayuda. Nada de eso es
 * una decisión de negocio, así que no hay motivo para que lo acierte un modelo
 * —ni para gastar un reintento cuando no lo acierta—.
 *
 * Pura. El test compara estructuras, sin renderizar nada.
 */
export const toFormilySchema = (draft: GeneratedForm): FormilyFormSchema => ({
  type: 'object',
  properties: Object.fromEntries(
    draft.fields.map((field) => [field.name, toFormilyField(field)]),
  ),
});

const toFormilyField = (field: GeneratedFormField): FormilyFieldSchema => ({
  // El tipo del valor lo decide el componente, no el modelo: un CheckboxField
  // guarda un booleano y un NumberField un número, siempre.
  type: formFieldValueTypes[field.component],
  title: field.title,
  required: field.isRequired,
  // Las cadenas y arreglos vacíos son la forma que tiene el structured output
  // de decir «no aplica» (ver `generated-form.ts`). Acá se vuelven ausencia:
  // un `x-component-props` con `placeholder: ''` le pondría un placeholder
  // vacío al input en vez de no ponerle ninguno.
  ...(field.options.length > 0 ? { enum: field.options } : {}),
  ...(field.placeholder.length > 0
    ? { 'x-component-props': { placeholder: field.placeholder } }
    : {}),
  ...(field.helpText.length > 0
    ? { 'x-decorator-props': { help: field.helpText } }
    : {}),
  'x-decorator': formFieldDecorators.formItem,
  'x-component': field.component,
});
