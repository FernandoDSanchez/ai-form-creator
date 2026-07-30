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
  title: 'Razón social',
  component: formFieldComponents.text,
  isRequired: true,
  helpText: '',
  placeholder: '',
  options: [],
  ...overrides,
});

const aForm = (fields: GeneratedFormField[]): GeneratedForm => ({
  title: 'Declaración',
  description: '',
  fields,
});

describe('toFormilySchema', () => {
  it('usa el `name` como clave de la propiedad', () => {
    const schema = toFormilySchema(aForm([aField()]));

    expect(Object.keys(schema.properties)).toEqual([
      formFieldNames.entityLegalName,
    ]);
  });

  it('deduce el tipo del valor a partir del componente', () => {
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
    // Las fechas viajan como string: el `DateField` guarda un ISO, no un `Date`.
    expect(schema.properties[formFieldNames.arrivalDate]?.type).toBe('string');
  });

  it('pone el decorador y el componente que espera el renderer del front', () => {
    const field = toFormilySchema(aForm([aField()])).properties[
      formFieldNames.entityLegalName
    ];

    expect(field).toMatchObject({
      'x-decorator': formFieldDecorators.formItem,
      'x-component': formFieldComponents.text,
      required: true,
    });
  });

  it('omite placeholder y ayuda cuando vienen vacíos', () => {
    // El vacío es cómo el structured output dice «no aplica». Copiarlo tal cual
    // le pondría al input un placeholder vacío en vez de ninguno.
    const field = toFormilySchema(aForm([aField()])).properties[
      formFieldNames.entityLegalName
    ];

    expect(field).not.toHaveProperty('x-component-props');
    expect(field).not.toHaveProperty('x-decorator-props');
    expect(field).not.toHaveProperty('enum');
  });

  it('traslada placeholder, ayuda y opciones cuando vienen con contenido', () => {
    const options = [
      { label: 'Bajo', value: 'bajo' },
      { label: 'Alto', value: 'alto' },
    ];

    const field = toFormilySchema(
      aForm([
        aField({
          name: formFieldNames.riskLevel,
          component: formFieldComponents.select,
          helpText: 'Según la matriz vigente.',
          placeholder: 'Elegí un nivel',
          options,
        }),
      ]),
    ).properties[formFieldNames.riskLevel];

    expect(field).toMatchObject({
      'x-component-props': { placeholder: 'Elegí un nivel' },
      'x-decorator-props': { help: 'Según la matriz vigente.' },
      enum: options,
    });
  });

  it('conserva el orden en que el modelo puso los campos', () => {
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
