import { formFieldComponents } from '@ai-form-creator/contracts/form-generation/form-field-component';
import { formFieldNames } from '@ai-form-creator/contracts/form-generation/form-field-name';
import type {
  GeneratedForm,
  GeneratedFormField,
} from '@ai-form-creator/contracts/form-generation/generated-form';

import { validateGeneratedForm } from '../validate-generated-form';

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

const aForm = (overrides: Partial<GeneratedForm> = {}): GeneratedForm => ({
  title: 'Declaración de importación',
  description: 'Datos exigidos por la resolución.',
  fields: [aField()],
  ...overrides,
});

const validate = (form: unknown) => validateGeneratedForm(JSON.stringify(form));

describe('validateGeneratedForm', () => {
  it('acepta un formulario que cumple el schema y las reglas cruzadas', () => {
    const result = validate(aForm());

    expect(result).toEqual({ isValid: true, draft: aForm() });
  });

  it('rechaza lo que no es JSON y lo explica en el idioma del prompt', () => {
    const result = validateGeneratedForm('Claro, acá va tu formulario:');

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems[0]).toContain(
      'no es JSON válido',
    );
  });

  it('tolera la respuesta envuelta en un bloque de código', () => {
    // Los modelos siguen haciéndolo aunque se les pida JSON pelado, y gastar
    // uno de los tres intentos en eso sería tirarlo.
    const result = validateGeneratedForm(
      `\`\`\`json\n${JSON.stringify(aForm())}\n\`\`\``,
    );

    expect(result.isValid).toBe(true);
  });

  it('rechaza un `name` que no está en el vocabulario', () => {
    const result = validate(
      aForm({
        fields: [{ ...aField(), name: 'razonSocial' as never }],
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems.join(' ')).toContain(
      '/fields/0/name',
    );
  });

  it('rechaza propiedades que el schema no declara', () => {
    const result = validate(
      aForm({
        fields: [{ ...aField(), sarasa: true } as GeneratedFormField],
      }),
    );

    expect(result.isValid).toBe(false);
  });

  it('rechaza un desplegable sin opciones, que el schema deja pasar', () => {
    // Es exactamente el caso que motiva el tercer filtro: cumple JSON Schema y
    // renderizaría un select vacío.
    const result = validate(
      aForm({
        fields: [
          aField({
            name: formFieldNames.riskLevel,
            component: formFieldComponents.select,
            options: [],
          }),
        ],
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems.join(' ')).toContain(
      'necesita al menos una opción',
    );
  });

  it('rechaza opciones en un componente que no las admite', () => {
    const result = validate(
      aForm({
        fields: [
          aField({
            component: formFieldComponents.text,
            options: [{ label: 'Sí', value: 'si' }],
          }),
        ],
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems.join(' ')).toContain(
      'no admite',
    );
  });

  it('rechaza un `name` repetido', () => {
    const result = validate(aForm({ fields: [aField(), aField()] }));

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems.join(' ')).toContain(
      'más de una vez',
    );
  });

  it('rechaza opciones con el mismo value', () => {
    const result = validate(
      aForm({
        fields: [
          aField({
            name: formFieldNames.riskLevel,
            component: formFieldComponents.radioGroup,
            options: [
              { label: 'Bajo', value: 'bajo' },
              { label: 'Reducido', value: 'bajo' },
            ],
          }),
        ],
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems.join(' ')).toContain(
      'mismo value',
    );
  });

  it('rechaza un formulario sin campos', () => {
    const result = validate(aForm({ fields: [] }));

    expect(result.isValid).toBe(false);
  });
});
