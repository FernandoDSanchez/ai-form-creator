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
 * Compiles the validated draft into Formily JSON.
 *
 * Everything mechanical about the format lives here and not in the prompt: the
 * value `type`, the decorator, where the `placeholder` goes, where the help
 * goes. None of that is a business decision, so there is no reason for a model
 * to have to get it right — nor to spend a retry when it does not.
 *
 * Pure. The test compares structures, without rendering anything.
 */
export const toFormilySchema = (draft: GeneratedForm): FormilyFormSchema => ({
  type: 'object',
  properties: Object.fromEntries(
    draft.fields.map((field) => [field.name, toFormilyField(field)]),
  ),
});

const toFormilyField = (field: GeneratedFormField): FormilyFieldSchema => ({
  // The value type is decided by the component, not by the model: a
  // CheckboxField stores a boolean and a NumberField a number, always.
  type: formFieldValueTypes[field.component],
  title: field.title,
  required: field.isRequired,
  // Empty strings and arrays are how the structured output says "not
  // applicable" (see `generated-form.ts`). Here they become absence: an
  // `x-component-props` with `placeholder: ''` would give the input an empty
  // placeholder instead of none at all.
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
