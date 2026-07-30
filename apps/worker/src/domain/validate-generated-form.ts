import { optionBackedFormFieldComponents } from '@ai-form-creator/contracts/form-generation/form-field-component';
import {
  generatedFormSchema,
  type GeneratedForm,
} from '@ai-form-creator/contracts/form-generation/generated-form';
// The `Value` comes from the package and not straight from
// `@sinclair/typebox/value`: it is the only copy where the formats are
// registered. See `validation.ts` over there.
import { Value } from '@ai-form-creator/contracts/validation';

import { MAX_REPORTED_PROBLEMS } from './generation-policy';
import type { FormDraftValidation } from './ports/form-generation-activities.port';

/**
 * The gatekeeper of the pipeline: this is where it is decided whether what the
 * model returned gets stored or gets handed back for fixing.
 *
 * Three filters, in order, and each one explains its rejection in plain words
 * because that text goes back to the model as an instruction:
 *
 *   1. **Is it JSON?** Models still wrap things in ```json sometimes.
 *   2. **Does it meet the schema?** `name` and `component` inside the enum,
 *      everything mandatory present, nothing extra.
 *   3. **Does it meet what the schema cannot say?** JSON Schema cannot express
 *      "`options` is mandatory if and only if the component is a list", nor
 *      "the `name`s do not repeat". Without this third step a `SelectField`
 *      with no options would be stored — one that validates perfectly and
 *      renders an empty dropdown.
 *
 * Pure and with no IO dependencies: it is tested end to end with literals.
 */
export const validateGeneratedForm = (raw: string): FormDraftValidation => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return {
      isValid: false,
      problems: [
        'The answer is not valid JSON. Return only the JSON object, with no ' +
          'text and no block delimiters around it.',
      ],
    };
  }

  const schemaProblems = collectSchemaProblems(parsed);

  if (schemaProblems.length > 0) {
    return { isValid: false, problems: schemaProblems };
  }

  // The `as` is backed by the `Value.Check` above: if the schema passed, the
  // shape is the type's.
  const draft = parsed as GeneratedForm;
  const semanticProblems = collectSemanticProblems(draft);

  return semanticProblems.length > 0
    ? { isValid: false, problems: semanticProblems }
    : { isValid: true, draft };
};

/**
 * Strips the ```json … ``` some models wrap the answer in even when asked for
 * pure JSON.
 *
 * It is tolerated instead of rejected because spending one of three attempts on
 * something a `slice` solves is throwing an attempt away. What is rejected is
 * anything else around it: there the model is doing something different from
 * what it was asked, and it is worth telling it so.
 */
const stripCodeFence = (raw: string): string => {
  const trimmed = raw.trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();
};

const collectSchemaProblems = (parsed: unknown): string[] => {
  if (Value.Check(generatedFormSchema, parsed)) {
    return [];
  }

  const seenPaths = new Set<string>();
  const problems: string[] = [];

  for (const error of Value.Errors(generatedFormSchema, parsed)) {
    // An `anyOf` of thirty constants produces one error per constant. Keeping
    // the first one of each path is enough to say what is wrong.
    if (seenPaths.has(error.path)) {
      continue;
    }

    seenPaths.add(error.path);
    problems.push(describeSchemaError(error.path, error.message, error.value));

    if (problems.length >= MAX_REPORTED_PROBLEMS) {
      break;
    }
  }

  return problems;
};

const describeSchemaError = (
  path: string,
  message: string,
  value: unknown,
): string => {
  const location = path === '' ? 'the root of the object' : path;

  return `At ${location}: ${message}. Received: ${preview(value)}.`;
};

const PREVIEW_MAX_LENGTH = 80;

const preview = (value: unknown): string => {
  // What gets serialised came out of a `JSON.parse`, so there are no cycles and
  // no `BigInt`: `JSON.stringify` cannot throw. It returns `undefined` when the
  // value is missing, which is exactly the case of an absent required property.
  const serialized = JSON.stringify(value) ?? 'nothing';

  return serialized.length > PREVIEW_MAX_LENGTH
    ? `${serialized.slice(0, PREVIEW_MAX_LENGTH)}…`
    : serialized;
};

/** The rules JSON Schema cannot express in `strict` mode. */
const collectSemanticProblems = (draft: GeneratedForm): string[] => {
  const problems: string[] = [];
  const seenNames = new Set<string>();

  for (const field of draft.fields) {
    if (seenNames.has(field.name)) {
      problems.push(
        `The "${field.name}" field appears more than once. Every name is used ` +
          'exactly once in the form.',
      );
    }

    seenNames.add(field.name);

    const needsOptions = optionBackedFormFieldComponents.includes(
      field.component,
    );

    if (needsOptions && field.options.length === 0) {
      problems.push(
        `The "${field.name}" field uses ${field.component}, which needs at ` +
          'least one option in `options`.',
      );
    }

    if (!needsOptions && field.options.length > 0) {
      problems.push(
        `The "${field.name}" field uses ${field.component}, which does not ` +
          'accept `options`. Leave it as an empty array or change the component.',
      );
    }

    const optionValues = field.options.map((option) => option.value);

    if (new Set(optionValues).size !== optionValues.length) {
      problems.push(
        `The "${field.name}" field has options with the same value. Every ` +
          'value appears exactly once.',
      );
    }
  }

  return problems.slice(0, MAX_REPORTED_PROBLEMS);
};
