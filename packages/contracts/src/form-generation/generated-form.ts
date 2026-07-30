import { Type, type Static } from '@sinclair/typebox';

// Extensión explícita: la salida ESM la necesita para que Node resuelva el
// import en runtime. TypeScript la mapea a `.ts` al compilar.
import { formFieldComponentSchema } from './form-field-component.js';
import { formFieldNameSchema } from './form-field-name.js';

/**
 * Lo que el LLM tiene que devolver: el **borrador** del formulario.
 *
 * No es JSON de Formily. Pedirle a un modelo que emita Formily directo es
 * pedirle que acierte `x-decorator`, `x-component-props` y el `type` de cada
 * campo en un formato recursivo y abierto — todo superficie para equivocarse,
 * y nada de eso es una decisión de negocio. Acá se le pide sólo lo que sólo él
 * puede aportar (qué campos, con qué título, obligatorio o no) sobre un
 * vocabulario cerrado, y el worker compila eso a Formily con
 * `to-formily-schema.ts`. Lo mecánico no se delega.
 *
 * Este schema viaja en `response_format.json_schema` de LiteLLM —proyectado
 * antes por `to-strict-json-schema.ts` del worker, que lo acomoda al dialecto
 * acotado del proveedor—, así que su forma está condicionada por el modo
 * `strict`:
 *
 * - **Nada opcional.** En `strict` todas las propiedades tienen que estar en
 *   `required`. Los campos que podrían faltar usan el vacío como ausencia
 *   (`''`, `[]`) en vez de `Type.Optional` o de una unión con `null`: las
 *   uniones nulables se traducen a `anyOf` y ahí es donde los proveedores
 *   empiezan a diferir entre sí.
 * - **`additionalProperties: false` en todos los objetos**, por lo mismo.
 * - **Sin `format`.** No está soportado en `strict` y lo que valida se
 *   verifica después, en el workflow.
 * - **`minItems`/`maxItems` valen acá, pero no llegan al proveedor.** Gemini
 *   rechaza el request entero con ellos puestos sobre arreglos de objetos, así
 *   que el worker los saca al proyectar. Se quedan igual porque es contra este
 *   schema que se valida la respuesta: lo que se pierde es la garantía al
 *   decodificar, no el límite.
 *
 * Sobre el `/* @__PURE__ *\/ (() => …)()` que envuelve cada schema: ver la nota
 * al pie del archivo.
 */

const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 400;
const HELP_TEXT_MAX_LENGTH = 240;
const PLACEHOLDER_MAX_LENGTH = 120;
const MIN_FIELDS = 1;
const MAX_FIELDS = 25;
const MAX_OPTIONS = 20;

/**
 * Límites, exportados para que el constructor del prompt pueda nombrarlos en
 * el texto. Repetir «máximo 25 campos» a mano en el prompt sería la clase de
 * literal que se desincroniza del schema al primer cambio.
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
      /** Lo que ve la persona. */
      label: Type.String({ minLength: 1 }),
      /** Lo que se guarda. */
      value: Type.String({ minLength: 1 }),
    },
    {
      additionalProperties: false,
      description: 'Opción de un campo de lista cerrada.',
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
        description: 'Etiqueta que ve la persona que llena el formulario.',
      }),
      component: formFieldComponentSchema,
      isRequired: Type.Boolean({
        description:
          '¿La norma exige este dato para dar el trámite por válido?',
      }),
      helpText: Type.String({
        maxLength: HELP_TEXT_MAX_LENGTH,
        description: 'Aclaración bajo el campo. Cadena vacía si no hace falta.',
      }),
      placeholder: Type.String({
        maxLength: PLACEHOLDER_MAX_LENGTH,
        description: 'Ejemplo dentro del campo. Cadena vacía si no aplica.',
      }),
      options: Type.Array(generatedFormFieldOptionSchema, {
        maxItems: MAX_OPTIONS,
        description:
          'Opciones para SelectField y RadioGroupField. Arreglo vacío para el resto.',
      }),
    },
    {
      additionalProperties: false,
      description: 'Un campo del formulario.',
    },
  ))();

export type GeneratedFormField = Static<typeof generatedFormFieldSchema>;

export const generatedFormSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      title: Type.String({
        minLength: 1,
        maxLength: TITLE_MAX_LENGTH,
        description: 'Nombre del formulario.',
      }),
      description: Type.String({
        maxLength: DESCRIPTION_MAX_LENGTH,
        description: 'Para qué sirve y a quién le toca llenarlo.',
      }),
      fields: Type.Array(generatedFormFieldSchema, {
        minItems: MIN_FIELDS,
        maxItems: MAX_FIELDS,
        description: 'Campos, en el orden en que se muestran.',
      }),
    },
    {
      $id: 'GeneratedForm',
      additionalProperties: false,
      description: 'Borrador de formulario producido por el modelo.',
    },
  ))();

export type GeneratedForm = Static<typeof generatedFormSchema>;

/* -----------------------------------------------------------------------------
 * Por qué la IIFE
 * -----------------------------------------------------------------------------
 * `/* @__PURE__ *\/ f(x)` le dice al bundler que **`f`** no tiene efectos, no
 * que `x` no los tenga. Con `Type.Enum(objeto, { literal })` alcanza, porque los
 * argumentos son datos. Pero un `Type.Object({ a: Type.String() })` tiene
 * llamadas adentro, y esas siguen siendo llamadas de origen desconocido: el
 * bundler descarta la de afuera y se queda con las de adentro, reteniendo el
 * import de TypeBox.
 *
 * El resultado es el que la anotación venía a evitar: el bundle del front se
 * lleva TypeBox entero (~65 KB) por importar de acá una constante de cinco
 * números. Y no se nota — el build no dice nada, sólo pesa más.
 *
 * Envolviendo en una función, las llamadas de adentro pasan a ser *cuerpo* y no
 * argumentos: no se evalúan hasta que alguien llame, y como la llamada está
 * anotada, si nadie usa el schema el bundler se lleva todo puesto.
 * -------------------------------------------------------------------------- */
