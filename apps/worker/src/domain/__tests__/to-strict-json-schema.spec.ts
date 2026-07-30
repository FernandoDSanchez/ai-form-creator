import { formFieldNames } from '@ai-form-creator/contracts/form-generation/form-field-name';
import { generatedFormSchema } from '@ai-form-creator/contracts/form-generation/generated-form';

import { toStrictJsonSchema } from '../to-strict-json-schema';

describe('toStrictJsonSchema', () => {
  it('colapsa un `anyOf` de constantes a un `enum`', () => {
    const projected = toStrictJsonSchema({
      description: 'Nivel',
      anyOf: [
        { const: 'bajo', type: 'string' },
        { const: 'alto', type: 'string' },
      ],
    });

    expect(projected).toEqual({
      description: 'Nivel',
      type: 'string',
      enum: ['bajo', 'alto'],
    });
  });

  it('deja el `anyOf` como está si mezcla tipos', () => {
    // Colapsar acá perdería información: mejor mandar algo que el proveedor
    // quizás entienda que algo que seguro miente.
    const projected = toStrictJsonSchema({
      anyOf: [
        { const: 'bajo', type: 'string' },
        { const: 1, type: 'number' },
      ],
    });

    expect(projected).toHaveProperty('anyOf');
    expect(projected).not.toHaveProperty('enum');
  });

  it('deja el `anyOf` como está si un miembro no es una constante pelada', () => {
    const projected = toStrictJsonSchema({
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });

    expect(projected).toHaveProperty('anyOf');
  });

  it('saca los `$id`, incluidos los anidados', () => {
    const projected = toStrictJsonSchema({
      $id: 'Raiz',
      type: 'object',
      properties: { campo: { $id: 'Anidado', type: 'string' } },
    });

    expect(projected).not.toHaveProperty('$id');
    expect(projected.properties).toEqual({ campo: { type: 'string' } });
  });

  it('saca `minItems` y `maxItems`, incluidos los anidados', () => {
    // Gemini contesta 400 con ellos puestos sobre arreglos de objetos, y el
    // mensaje no dice cuál argumento le molestó. Ver el punto 4 del módulo.
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

  it('fuerza `additionalProperties: false` y todo `required` en cada objeto', () => {
    const projected = toStrictJsonSchema({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
    });

    expect(projected).toMatchObject({
      additionalProperties: false,
      required: ['a', 'b'],
    });
  });

  describe('sobre el schema real que viaja a LiteLLM', () => {
    const projected = toStrictJsonSchema(generatedFormSchema);

    it('deja el vocabulario de campos como un `enum` plano', () => {
      const fields = projected.properties as Record<string, never>;
      const name = (
        fields.fields as { items: { properties: Record<string, unknown> } }
      ).items.properties.name as { enum: string[] };

      expect(name.enum).toEqual(Object.values(formFieldNames));
    });

    it('no deja ni un `$id` ni un `anyOf` en todo el árbol', () => {
      // Es la garantía que importa: los dos son justo lo que los proveedores
      // en modo `strict` rechazan o ignoran en silencio.
      const serialized = JSON.stringify(projected);

      expect(serialized).not.toContain('$id');
      expect(serialized).not.toContain('anyOf');
    });

    it('no deja restricciones de cardinalidad en ninguno de los dos arreglos', () => {
      // `fields` traía `minItems`/`maxItems` y `options` traía `maxItems`: los
      // tres tienen que quedar afuera o el request no sale de Gemini.
      const serialized = JSON.stringify(projected);

      expect(serialized).not.toContain('minItems');
      expect(serialized).not.toContain('maxItems');
    });

    it('conserva el resto de las restricciones, que sí viajan', () => {
      // El contrapeso del test de arriba: se saca lo que rompe, no todo lo que
      // se parezca. `minLength`/`maxLength` pasan y valen — acotan el largo de
      // los títulos sin costo.
      const serialized = JSON.stringify(projected);

      expect(serialized).toContain('maxLength');
      expect(serialized).toContain('minLength');
    });

    it('sigue siendo serializable a JSON sin perder nada', () => {
      expect(() => JSON.stringify(projected)).not.toThrow();
    });
  });
});
