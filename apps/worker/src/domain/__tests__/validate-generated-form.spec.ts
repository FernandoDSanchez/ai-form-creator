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
  title: 'Legal name',
  component: formFieldComponents.text,
  isRequired: true,
  helpText: '',
  placeholder: '',
  options: [],
  ...overrides,
});

const aForm = (overrides: Partial<GeneratedForm> = {}): GeneratedForm => ({
  title: 'Import declaration',
  description: 'Data required by the regulation.',
  fields: [aField()],
  ...overrides,
});

const validate = (form: unknown) => validateGeneratedForm(JSON.stringify(form));

describe('validateGeneratedForm', () => {
  it('accepts a form meeting the schema and the cross-cutting rules', () => {
    const result = validate(aForm());

    expect(result).toEqual({ isValid: true, draft: aForm() });
  });

  it('rejects what is not JSON and explains it in the prompt language', () => {
    const result = validateGeneratedForm('Sure, here is your form:');

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems[0]).toContain(
      'not valid JSON',
    );
  });

  it('tolerates an answer wrapped in a code block', () => {
    // Models still do it even when asked for bare JSON, and spending one of the
    // three attempts on that would be throwing it away.
    const result = validateGeneratedForm(
      `\`\`\`json\n${JSON.stringify(aForm())}\n\`\`\``,
    );

    expect(result.isValid).toBe(true);
  });

  it('rejects a `name` that is not in the vocabulary', () => {
    const result = validate(
      aForm({
        fields: [{ ...aField(), name: 'companyName' as never }],
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems.join(' ')).toContain(
      '/fields/0/name',
    );
  });

  it('rejects properties the schema does not declare', () => {
    const result = validate(
      aForm({
        fields: [{ ...aField(), whatever: true } as GeneratedFormField],
      }),
    );

    expect(result.isValid).toBe(false);
  });

  it('rejects a dropdown with no options, which the schema lets through', () => {
    // This is exactly the case motivating the third filter: it meets JSON
    // Schema and would render an empty select.
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
      'needs at least one option',
    );
  });

  it('rejects options on a component that does not accept them', () => {
    const result = validate(
      aForm({
        fields: [
          aField({
            component: formFieldComponents.text,
            options: [{ label: 'Yes', value: 'yes' }],
          }),
        ],
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems.join(' ')).toContain(
      'does not accept',
    );
  });

  it('rejects a repeated `name`', () => {
    const result = validate(aForm({ fields: [aField(), aField()] }));

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems.join(' ')).toContain(
      'more than once',
    );
  });

  it('rejects options with the same value', () => {
    const result = validate(
      aForm({
        fields: [
          aField({
            name: formFieldNames.riskLevel,
            component: formFieldComponents.radioGroup,
            options: [
              { label: 'Low', value: 'low' },
              { label: 'Reduced', value: 'low' },
            ],
          }),
        ],
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.problems.join(' ')).toContain(
      'same value',
    );
  });

  it('rejects a form with no fields', () => {
    const result = validate(aForm({ fields: [] }));

    expect(result.isValid).toBe(false);
  });
});
