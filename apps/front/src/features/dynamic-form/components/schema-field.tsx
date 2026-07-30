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
 * Variant Mapping of the renderer: `x-component` (a schema string) -> component.
 * Adding a new field type = adding the constant in `field-components.ts` and
 * its entry here. No `if/else` and no `switch` in the rendering.
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
