import {
  formFieldComponents,
  formFieldDecorators,
} from '@ai-form-creator/contracts/form-generation/form-field-component';
import { formFieldNames } from '@ai-form-creator/contracts/form-generation/form-field-name';
import type {
  GeneratedForm,
  GeneratedFormField,
} from '@ai-form-creator/contracts/form-generation/generated-form';

import { toFormilySchema } from '../to-formily-schema';

const aField = (
  overrides: Partial<GeneratedFormField> = {},
): GeneratedFormField => ({
  name: formFieldNames.entityLegalName,
  title: 'Legal name',
  component: formFieldComponents.text,
  isRequired: true,
  helpText: '',
  placeholder: '',
  options: [],
  ...overrides,
});

const aForm = (fields: GeneratedFormField[]): GeneratedForm => ({
  title: 'Declaration',
  description: '',
  fields,
});

describe('toFormilySchema', () => {
  it('uses the `name` as the property key', () => {
    const schema = toFormilySchema(aForm([aField()]));

    expect(Object.keys(schema.properties)).toEqual([
      formFieldNames.entityLegalName,
    ]);
  });

  it('derives the value type from the component', () => {
    const schema = toFormilySchema(
      aForm([
        aField({
          name: formFieldNames.declaredValue,
          component: formFieldComponents.number,
        }),
        aField({
          name: formFieldNames.dutiesPaid,
          component: formFieldComponents.checkbox,
        }),
        aField({
          name: formFieldNames.arrivalDate,
          component: formFieldComponents.date,
        }),
      ]),
    );

    expect(schema.properties[formFieldNames.declaredValue]?.type).toBe(
      'number',
    );
    expect(schema.properties[formFieldNames.dutiesPaid]?.type).toBe('boolean');
    // Dates travel as strings: the `DateField` stores an ISO value, not a `Date`.
    expect(schema.properties[formFieldNames.arrivalDate]?.type).toBe('string');
  });

  it('sets the decorator and component the front renderer expects', () => {
    const field = toFormilySchema(aForm([aField()])).properties[
      formFieldNames.entityLegalName
    ];

    expect(field).toMatchObject({
      'x-decorator': formFieldDecorators.formItem,
      'x-component': formFieldComponents.text,
      required: true,
    });
  });

  it('omits placeholder and help when they come in empty', () => {
    // Emptiness is how the structured output says "not applicable". Copying it
    // as-is would give the input an empty placeholder instead of none.
    const field = toFormilySchema(aForm([aField()])).properties[
      formFieldNames.entityLegalName
    ];

    expect(field).not.toHaveProperty('x-component-props');
    expect(field).not.toHaveProperty('x-decorator-props');
    expect(field).not.toHaveProperty('enum');
  });

  it('carries placeholder, help and options over when they have content', () => {
    const options = [
      { label: 'Low', value: 'low' },
      { label: 'High', value: 'high' },
    ];

    const field = toFormilySchema(
      aForm([
        aField({
          name: formFieldNames.riskLevel,
          component: formFieldComponents.select,
          helpText: 'According to the current matrix.',
          placeholder: 'Choose a level',
          options,
        }),
      ]),
    ).properties[formFieldNames.riskLevel];

    expect(field).toMatchObject({
      'x-component-props': { placeholder: 'Choose a level' },
      'x-decorator-props': { help: 'According to the current matrix.' },
      enum: options,
    });
  });

  it('keeps the order in which the model put the fields', () => {
    const schema = toFormilySchema(
      aForm([
        aField({ name: formFieldNames.entityLegalName }),
        aField({ name: formFieldNames.declarationAccepted }),
      ]),
    );

    expect(Object.keys(schema.properties)).toEqual([
      formFieldNames.entityLegalName,
      formFieldNames.declarationAccepted,
    ]);
  });
});
