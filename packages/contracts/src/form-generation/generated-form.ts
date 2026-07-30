import { Type, type Static } from '@sinclair/typebox';

// Explicit extension: the ESM output needs it so Node can resolve the import at
// runtime. TypeScript maps it back to `.ts` when compiling.
import { formFieldComponentSchema } from './form-field-component.js';
import { formFieldNameSchema } from './form-field-name.js';

/**
 * What the LLM has to return: the form **draft**.
 *
 * It is not Formily JSON. Asking a model to emit Formily directly is asking it
 * to get `x-decorator`, `x-component-props` and the `type` of every field right
 * in a recursive, open-ended format — all surface for mistakes, and none of it
 * a business decision. Here it is asked only for what only it can contribute
 * (which fields, with which title, required or not) over a closed vocabulary,
 * and the worker compiles that into Formily with `to-formily-schema.ts`. The
 * mechanical part is not delegated.
 *
 * This schema travels in LiteLLM's `response_format.json_schema` — projected
 * first by the worker's `to-strict-json-schema.ts`, which adapts it to the
 * provider's narrow dialect — so its shape is constrained by `strict` mode:
 *
 * - **Nothing optional.** In `strict` every property has to be in `required`.
 *   Fields that could be missing use emptiness as absence (`''`, `[]`) instead
 *   of `Type.Optional` or a union with `null`: nullable unions translate into
 *   `anyOf`, and that is where providers start differing from each other.
 * - **`additionalProperties: false` on every object**, for the same reason.
 * - **No `format`.** It is not supported in `strict`, and what it validates is
 *   checked afterwards, in the workflow.
 * - **`minItems`/`maxItems` hold here, but never reach the provider.** Gemini
 *   rejects the whole request with them set on arrays of objects, so the worker
 *   strips them while projecting. They stay anyway because the response is
 *   validated against this schema: what is lost is the guarantee while
 *   decoding, not the limit.
 *
 * On the `/* @__PURE__ *\/ (() => …)()` wrapping every schema: see the note at
 * the bottom of the file.
 */

const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 400;
const HELP_TEXT_MAX_LENGTH = 240;
const PLACEHOLDER_MAX_LENGTH = 120;
const MIN_FIELDS = 1;
const MAX_FIELDS = 25;
const MAX_OPTIONS = 20;

/**
 * Limits, exported so the prompt builder can name them in its text. Repeating
 * "at most 25 fields" by hand in the prompt would be the kind of literal that
 * drifts from the schema at the first change.
 */
export const generatedFormLimits = {
  titleMaxLength: TITLE_MAX_LENGTH,
  descriptionMaxLength: DESCRIPTION_MAX_LENGTH,
  minFields: MIN_FIELDS,
  maxFields: MAX_FIELDS,
  maxOptions: MAX_OPTIONS,
} as const;

export const generatedFormFieldOptionSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      /** What the person sees. */
      label: Type.String({ minLength: 1 }),
      /** What gets stored. */
      value: Type.String({ minLength: 1 }),
    },
    {
      additionalProperties: false,
      description: 'An option of a closed-list field.',
    },
  ))();

export type GeneratedFormFieldOption = Static<
  typeof generatedFormFieldOptionSchema
>;

export const generatedFormFieldSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      name: formFieldNameSchema,
      title: Type.String({
        minLength: 1,
        maxLength: TITLE_MAX_LENGTH,
        description: 'Label seen by the person filling in the form.',
      }),
      component: formFieldComponentSchema,
      isRequired: Type.Boolean({
        description:
          'Does the regulation require this data for the filing to be valid?',
      }),
      helpText: Type.String({
        maxLength: HELP_TEXT_MAX_LENGTH,
        description: 'Note under the field. Empty string if not needed.',
      }),
      placeholder: Type.String({
        maxLength: PLACEHOLDER_MAX_LENGTH,
        description:
          'Example inside the field. Empty string if not applicable.',
      }),
      options: Type.Array(generatedFormFieldOptionSchema, {
        maxItems: MAX_OPTIONS,
        description:
          'Options for SelectField and RadioGroupField. Empty array for the rest.',
      }),
    },
    {
      additionalProperties: false,
      description: 'A field of the form.',
    },
  ))();

export type GeneratedFormField = Static<typeof generatedFormFieldSchema>;

export const generatedFormSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      title: Type.String({
        minLength: 1,
        maxLength: TITLE_MAX_LENGTH,
        description: 'Name of the form.',
      }),
      description: Type.String({
        maxLength: DESCRIPTION_MAX_LENGTH,
        description: 'What it is for and who has to fill it in.',
      }),
      fields: Type.Array(generatedFormFieldSchema, {
        minItems: MIN_FIELDS,
        maxItems: MAX_FIELDS,
        description: 'Fields, in the order they are displayed.',
      }),
    },
    {
      $id: 'GeneratedForm',
      additionalProperties: false,
      description: 'Form draft produced by the model.',
    },
  ))();

export type GeneratedForm = Static<typeof generatedFormSchema>;

/* -----------------------------------------------------------------------------
 * Why the IIFE
 * -----------------------------------------------------------------------------
 * `/* @__PURE__ *\/ f(x)` tells the bundler that **`f`** has no side effects,
 * not that `x` has none. With `Type.Enum(object, { literal })` that is enough,
 * because the arguments are data. But a `Type.Object({ a: Type.String() })` has
 * calls inside it, and those are still calls of unknown origin: the bundler
 * drops the outer one and keeps the inner ones, retaining the TypeBox import.
 *
 * The result is exactly what the annotation was meant to prevent: the front
 * bundle carries all of TypeBox (~65 KB) because it imported a five-number
 * constant from here. And it goes unnoticed — the build says nothing, it just
 * weighs more.
 *
 * Wrapping in a function turns the inner calls into a *body* rather than
 * arguments: they are not evaluated until somebody calls, and since the call is
 * annotated, if nobody uses the schema the bundler takes everything with it.
 * -------------------------------------------------------------------------- */
