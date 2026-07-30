/**
 * Translates the JSON Schema TypeBox emits into the narrow dialect providers
 * accept in `strict` mode.
 *
 * Four fixes are needed, and none of them is cosmetic:
 *
 * 1. **`anyOf` of `const` → `enum`.** `Type.Enum` produces
 *    `anyOf: [{const:'a',type:'string'}, …]`. It is correct JSON Schema, but
 *    Gemini — the model currently behind LiteLLM — works with an OpenAPI-like
 *    subset where closed lists are expressed with `enum` and an `anyOf` of
 *    constants is not understood. With 32 fields in the vocabulary, that
 *    difference is what decides whether the model knows which list to choose
 *    from.
 * 2. **`$id` out.** A nested `$id` opens a new base URI scope, and provider
 *    validators either reject it or ignore it in different ways. It
 *    contributes nothing on the model side.
 * 3. **`additionalProperties: false` and `required` with everything.** It is
 *    literally what `strict` demands. The package schemas already come that
 *    way, but forcing it here makes a thoughtlessly added `Type.Optional` fail
 *    when sending and not in the answer.
 * 4. **`minItems`/`maxItems` out.** With them set, Gemini answers
 *    `400 INVALID_ARGUMENT` with the message "Request contains an invalid
 *    argument", which does not say which. It is not that it does not support
 *    them: an array of strings with both set goes through without complaint.
 *    Here the arrays carry objects inside — and `fields[]` carries another
 *    array, `options[]` — and in that shape it rejects them. Pinning this down
 *    required bisecting the schema word by word against the real LiteLLM:
 *    removing anything else (`strict`, `additionalProperties`,
 *    `minLength`/`maxLength`, `description`, `required`) the 400 persisted;
 *    removing this pair, 200.
 *
 *    The limit is not lost, it moves. The prompt already names the same numbers
 *    from `generatedFormLimits`, and `validate-generated-form.ts` validates the
 *    answer against the whole TypeBox schema — with `minItems` and `maxItems`
 *    inside — so a thirty-field form falls into the repair loop. What is lost
 *    is the provider guaranteeing it while decoding, and that is worth less
 *    than a pipeline that starts.
 *
 * A pure function over data: it receives a schema, it returns another. It does
 * not import TypeBox — it does not need to, a schema is an object.
 */

export type StrictJsonSchema = Record<string, unknown>;

/** Keywords that do not travel to the provider. See points 2 and 4 above. */
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

  // First it cleans up and walks down the tree, and **then** it attempts the
  // collapse into `enum`. The other way around — which is how it used to be —
  // the node turning into an enum skipped the keyword filter and carried its
  // `$id` along: precisely in the two nodes where it matters most, which are
  // the two vocabularies.
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
 * Collapses an `anyOf` of constants of the same primitive type into an `enum`.
 *
 * If the union mixes types, or any of its members carries anything beyond
 * `const` and `type`, it is left as it is: losing information would be worse
 * than sending an `anyOf` the provider might understand.
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
