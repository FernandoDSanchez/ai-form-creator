import { formFieldNames } from '@ai-form-creator/contracts/form-generation/form-field-name';
import { generatedFormSchema } from '@ai-form-creator/contracts/form-generation/generated-form';

import { toStrictJsonSchema } from '../to-strict-json-schema';

describe('toStrictJsonSchema', () => {
  it('collapses an `anyOf` of constants into an `enum`', () => {
    const projected = toStrictJsonSchema({
      description: 'Level',
      anyOf: [
        { const: 'low', type: 'string' },
        { const: 'high', type: 'string' },
      ],
    });

    expect(projected).toEqual({
      description: 'Level',
      type: 'string',
      enum: ['low', 'high'],
    });
  });

  it('leaves the `anyOf` as it is if it mixes types', () => {
    // Collapsing here would lose information: better to send something the
    // provider might understand than something that certainly lies.
    const projected = toStrictJsonSchema({
      anyOf: [
        { const: 'low', type: 'string' },
        { const: 1, type: 'number' },
      ],
    });

    expect(projected).toHaveProperty('anyOf');
    expect(projected).not.toHaveProperty('enum');
  });

  it('leaves the `anyOf` as it is if a member is not a bare constant', () => {
    const projected = toStrictJsonSchema({
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });

    expect(projected).toHaveProperty('anyOf');
  });

  it('strips the `$id`s, nested ones included', () => {
    const projected = toStrictJsonSchema({
      $id: 'Root',
      type: 'object',
      properties: { field: { $id: 'Nested', type: 'string' } },
    });

    expect(projected).not.toHaveProperty('$id');
    expect(projected.properties).toEqual({ field: { type: 'string' } });
  });

  it('strips `minItems` and `maxItems`, nested ones included', () => {
    // Gemini answers 400 with them set on arrays of objects, and the message
    // does not say which argument bothered it. See point 4 of the module.
    const projected = toStrictJsonSchema({
      type: 'array',
      minItems: 1,
      maxItems: 25,
      items: {
        type: 'object',
        properties: {
          options: { type: 'array', maxItems: 20, items: { type: 'string' } },
        },
      },
    });

    expect(JSON.stringify(projected)).not.toMatch(/minItems|maxItems/);
  });

  it('forces `additionalProperties: false` and everything `required` on every object', () => {
    const projected = toStrictJsonSchema({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
    });

    expect(projected).toMatchObject({
      additionalProperties: false,
      required: ['a', 'b'],
    });
  });

  describe('over the real schema travelling to LiteLLM', () => {
    const projected = toStrictJsonSchema(generatedFormSchema);

    it('leaves the field vocabulary as a flat `enum`', () => {
      const fields = projected.properties as Record<string, never>;
      const name = (
        fields.fields as { items: { properties: Record<string, unknown> } }
      ).items.properties.name as { enum: string[] };

      expect(name.enum).toEqual(Object.values(formFieldNames));
    });

    it('leaves neither a `$id` nor an `anyOf` anywhere in the tree', () => {
      // This is the guarantee that matters: both are exactly what providers in
      // `strict` mode reject or silently ignore.
      const serialized = JSON.stringify(projected);

      expect(serialized).not.toContain('$id');
      expect(serialized).not.toContain('anyOf');
    });

    it('leaves no cardinality constraints on either of the two arrays', () => {
      // `fields` carried `minItems`/`maxItems` and `options` carried
      // `maxItems`: all three have to stay out or the request never leaves
      // Gemini.
      const serialized = JSON.stringify(projected);

      expect(serialized).not.toContain('minItems');
      expect(serialized).not.toContain('maxItems');
    });

    it('keeps the rest of the constraints, which do travel', () => {
      // The counterweight to the test above: what breaks is removed, not
      // everything that looks like it. `minLength`/`maxLength` go through and
      // are worth it — they bound the title lengths at no cost.
      const serialized = JSON.stringify(projected);

      expect(serialized).toContain('maxLength');
      expect(serialized).toContain('minLength');
    });

    it('is still serialisable to JSON without losing anything', () => {
      expect(() => JSON.stringify(projected)).not.toThrow();
    });
  });
});
