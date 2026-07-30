import { optionBackedFormFieldComponents } from '@ai-form-creator/contracts/form-generation/form-field-component';
import {
  generatedFormSchema,
  type GeneratedForm,
} from '@ai-form-creator/contracts/form-generation/generated-form';
// El `Value` sale del paquete y no de `@sinclair/typebox/value` directo: es la
// única copia donde están registrados los formatos. Ver `validation.ts` allá.
import { Value } from '@ai-form-creator/contracts/validation';

import { MAX_REPORTED_PROBLEMS } from './generation-policy';
import type { FormDraftValidation } from './ports/form-generation-activities.port';

/**
 * El portero del pipeline: acá se decide si lo que devolvió el modelo se
 * guarda o se le devuelve para que lo arregle.
 *
 * Son tres filtros, en orden, y cada uno explica su rechazo en castellano
 * porque ese texto vuelve al modelo como instrucción:
 *
 *   1. **¿Es JSON?** Los modelos todavía envuelven en ```json a veces.
 *   2. **¿Cumple el schema?** `name` y `component` dentro del enum, todo lo
 *      obligatorio presente, nada de más.
 *   3. **¿Cumple lo que el schema no puede decir?** JSON Schema no expresa
 *      «`options` es obligatorio si y sólo si el componente es una lista», ni
 *      «los `name` no se repiten». Sin este tercer paso se guardaría un
 *      `SelectField` sin opciones — que valida perfecto y renderiza un
 *      desplegable vacío.
 *
 * Puro y sin dependencias de IO: se testea entero con literales.
 */
export const validateGeneratedForm = (raw: string): FormDraftValidation => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return {
      isValid: false,
      problems: [
        'La respuesta no es JSON válido. Devolvé únicamente el objeto JSON, ' +
          'sin texto ni delimitadores de bloque alrededor.',
      ],
    };
  }

  const schemaProblems = collectSchemaProblems(parsed);

  if (schemaProblems.length > 0) {
    return { isValid: false, problems: schemaProblems };
  }

  // El `as` está respaldado por el `Value.Check` de arriba: si el schema pasó,
  // la forma es la del tipo.
  const draft = parsed as GeneratedForm;
  const semanticProblems = collectSemanticProblems(draft);

  return semanticProblems.length > 0
    ? { isValid: false, problems: semanticProblems }
    : { isValid: true, draft };
};

/**
 * Saca el ```json … ``` con el que algunos modelos envuelven la respuesta aun
 * pidiéndoles JSON puro.
 *
 * Se tolera en vez de rechazarse porque gastar un intento de tres en algo que
 * se resuelve con un `slice` es tirar un intento. Lo que sí se rechaza es
 * cualquier otra cosa alrededor: ahí el modelo está haciendo algo distinto de
 * lo que se le pidió y conviene decírselo.
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
    // Un `anyOf` de treinta constantes produce un error por constante. Con
    // quedarse con el primero de cada ruta alcanza para decir qué está mal.
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
  const location = path === '' ? 'la raíz del objeto' : path;

  return `En ${location}: ${message}. Recibido: ${preview(value)}.`;
};

const PREVIEW_MAX_LENGTH = 80;

const preview = (value: unknown): string => {
  // Lo que se serializa salió de un `JSON.parse`, así que no hay ciclos ni
  // `BigInt`: `JSON.stringify` no puede tirar. Devuelve `undefined` cuando el
  // valor falta, que es justo el caso de una propiedad obligatoria ausente.
  const serialized = JSON.stringify(value) ?? 'nada';

  return serialized.length > PREVIEW_MAX_LENGTH
    ? `${serialized.slice(0, PREVIEW_MAX_LENGTH)}…`
    : serialized;
};

/** Las reglas que JSON Schema no puede expresar en modo `strict`. */
const collectSemanticProblems = (draft: GeneratedForm): string[] => {
  const problems: string[] = [];
  const seenNames = new Set<string>();

  for (const field of draft.fields) {
    if (seenNames.has(field.name)) {
      problems.push(
        `El campo "${field.name}" aparece más de una vez. Cada name se usa ` +
          'una sola vez en el formulario.',
      );
    }

    seenNames.add(field.name);

    const needsOptions = optionBackedFormFieldComponents.includes(
      field.component,
    );

    if (needsOptions && field.options.length === 0) {
      problems.push(
        `El campo "${field.name}" usa ${field.component}, que necesita al ` +
          'menos una opción en `options`.',
      );
    }

    if (!needsOptions && field.options.length > 0) {
      problems.push(
        `El campo "${field.name}" usa ${field.component}, que no admite ` +
          '`options`. Dejalo como arreglo vacío o cambiá el componente.',
      );
    }

    const optionValues = field.options.map((option) => option.value);

    if (new Set(optionValues).size !== optionValues.length) {
      problems.push(
        `El campo "${field.name}" tiene opciones con el mismo value. Cada ` +
          'value se repite una sola vez.',
      );
    }
  }

  return problems.slice(0, MAX_REPORTED_PROBLEMS);
};
