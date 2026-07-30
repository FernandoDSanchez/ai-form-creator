/**
 * Traduce el JSON Schema que emite TypeBox al dialecto acotado que aceptan los
 * proveedores en modo `strict`.
 *
 * Hacen falta cuatro arreglos, y ninguno es cosmético:
 *
 * 1. **`anyOf` de `const` → `enum`.** `Type.Enum` produce
 *    `anyOf: [{const:'a',type:'string'}, …]`. Es JSON Schema correcto, pero
 *    Gemini —el modelo que hoy está detrás de LiteLLM— trabaja con un
 *    subconjunto tipo OpenAPI donde las listas cerradas se expresan con `enum`
 *    y `anyOf` de constantes no se entiende. Con 32 campos en el vocabulario,
 *    esa diferencia es la que decide si el modelo sabe de qué lista elegir.
 * 2. **`$id` afuera.** Un `$id` anidado abre un ámbito de URI base nuevo, y los
 *    validadores de los proveedores lo rechazan o lo ignoran de formas
 *    distintas. No aporta nada del lado del modelo.
 * 3. **`additionalProperties: false` y `required` con todo.** Es literalmente
 *    lo que `strict` exige. Los schemas del paquete ya vienen así, pero
 *    forzarlo acá hace que un `Type.Optional` agregado sin pensar falle al
 *    mandar y no en la respuesta.
 * 4. **`minItems`/`maxItems` afuera.** Con ellos puestos, Gemini contesta
 *    `400 INVALID_ARGUMENT` con el mensaje «Request contains an invalid
 *    argument», que no dice cuál. No es que no los soporte: un arreglo de
 *    strings con los dos puestos pasa sin chistar. Acá los arreglos llevan
 *    objetos adentro —y `fields[]` lleva otro arreglo, `options[]`— y en esa
 *    forma los rechaza. Ubicarlo requirió bisecar el schema palabra por
 *    palabra contra el LiteLLM real: sacando cualquier otra cosa (`strict`,
 *    `additionalProperties`, `minLength`/`maxLength`, `description`,
 *    `required`) el 400 seguía; sacando este par, 200.
 *
 *    El límite no se pierde, se corre de lugar. El prompt ya nombra los mismos
 *    números desde `generatedFormLimits`, y `validate-generated-form.ts`
 *    valida la respuesta contra el schema entero de TypeBox —con `minItems` y
 *    `maxItems` adentro—, así que un formulario de treinta campos cae en el
 *    bucle de reparación. Lo que se pierde es que el proveedor lo garantice al
 *    decodificar, y eso vale menos que un pipeline que arranca.
 *
 * Función pura sobre datos: recibe un schema, devuelve otro. No importa
 * TypeBox — no le hace falta, un schema es un objeto.
 */

export type StrictJsonSchema = Record<string, unknown>;

/** Palabras clave que no viajan al proveedor. Ver los puntos 2 y 4 de arriba. */
const droppedKeywords: readonly string[] = [
  '$id',
  '$schema',
  'minItems',
  'maxItems',
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const toStrictJsonSchema = (schema: unknown): StrictJsonSchema => {
  const projected = project(schema);

  return isPlainObject(projected) ? projected : {};
};

const project = (node: unknown): unknown => {
  if (Array.isArray(node)) {
    return node.map(project);
  }

  if (!isPlainObject(node)) {
    return node;
  }

  // Primero se limpia y se baja por el árbol, y **después** se intenta el
  // colapso a `enum`. Al revés —que es como estaba— el nodo que se convertía en
  // enum se saltaba el filtro de palabras clave y se llevaba su `$id` puesto:
  // justo en los dos nodos donde más importa, que son los dos vocabularios.
  const result: Record<string, unknown> = {};

  for (const [keyword, value] of Object.entries(node)) {
    if (droppedKeywords.includes(keyword)) {
      continue;
    }

    result[keyword] = project(value);
  }

  const asEnum = toEnum(result);

  if (asEnum) {
    return asEnum;
  }

  if (result.type === 'object' && isPlainObject(result.properties)) {
    result.additionalProperties = false;
    result.required = Object.keys(result.properties);
  }

  return result;
};

/**
 * Colapsa `anyOf` de constantes del mismo tipo primitivo a un `enum`.
 *
 * Si la unión mezcla tipos, o alguno de sus miembros trae algo más que `const`
 * y `type`, se deja como está: perder información sería peor que mandar un
 * `anyOf` que el proveedor quizás entienda.
 */
const toEnum = (node: Record<string, unknown>): StrictJsonSchema | null => {
  const { anyOf, ...rest } = node;

  if (!Array.isArray(anyOf) || anyOf.length === 0) {
    return null;
  }

  const values: unknown[] = [];
  const types = new Set<unknown>();

  for (const member of anyOf) {
    if (!isPlainObject(member) || !('const' in member)) {
      return null;
    }

    const extraKeywords = Object.keys(member).filter(
      (keyword) => keyword !== 'const' && keyword !== 'type',
    );

    if (extraKeywords.length > 0) {
      return null;
    }

    values.push(member.const);
    types.add(member.type);
  }

  if (types.size !== 1) {
    return null;
  }

  const [type] = [...types];

  return {
    ...rest,
    ...(type === undefined ? {} : { type }),
    enum: values,
  };
};
