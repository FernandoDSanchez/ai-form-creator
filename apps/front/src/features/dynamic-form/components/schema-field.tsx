import { createSchemaField } from '@formily/react';

import {
  formFieldComponents,
  formFieldDecorators,
} from '../config/field-components';

import { CheckboxField } from './fields/checkbox-field';
import { DateField } from './fields/date-field';
import { NumberField } from './fields/number-field';
import { RadioGroupField } from './fields/radio-group-field';
import { SelectField } from './fields/select-field';
import { TextField } from './fields/text-field';
import { TextareaField } from './fields/textarea-field';
import { FormItem } from './form-item';

/**
 * Variant Mapping del renderer: `x-component` (string del schema) -> componente.
 * Añadir un tipo de campo nuevo = añadir la constante en `field-components.ts`
 * y su entrada aquí. Ningún `if/else` ni `switch` en el renderizado.
 */
export const SchemaField = createSchemaField({
  components: {
    [formFieldDecorators.formItem]: FormItem,
    [formFieldComponents.text]: TextField,
    [formFieldComponents.textarea]: TextareaField,
    [formFieldComponents.number]: NumberField,
    [formFieldComponents.select]: SelectField,
    [formFieldComponents.checkbox]: CheckboxField,
    [formFieldComponents.radioGroup]: RadioGroupField,
    [formFieldComponents.date]: DateField,
  },
});
