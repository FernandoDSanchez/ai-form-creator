import { Type, type Static } from '@sinclair/typebox';

import { generatedFormFieldOptionSchema } from './generated-form.js';

/**
 * El JSON de Formily que termina en la base y que el front renderiza.
 *
 * Es el **subconjunto** de `ISchema` que este sistema emite, no `ISchema`
 * entero: la definición de Formily es recursiva y abierta (todo opcional, todo
 * `any` en las props), o sea impracticable como contrato. Describir sólo lo que
 * el compilador produce hace que el front reciba un tipo con campos concretos
 * y que un cambio en el compilador rompa la compilación de las dos apps.
 *
 * Lo produce `apps/worker` (`domain/to-formily-schema.ts`) a partir del
 * borrador validado; el back sólo lo guarda y lo sirve.
 */

// La IIFE no es adorno: sin ella las llamadas anidadas (`Type.String()`,
// `Type.Literal()`…) quedan como argumentos con efectos desconocidos y el
// bundler retiene TypeBox aunque nadie use el schema. La explicación completa
// está al pie de `generated-form.ts`.
const formilyFieldSchema = /* @__PURE__ */ (() =>
  Type.Object({
    /** Tipo del valor. Lo deduce el compilador del `x-component`, no la IA. */
    type: Type.Union([
      Type.Literal('string'),
      Type.Literal('number'),
      Type.Literal('boolean'),
    ]),
    title: Type.String(),
    required: Type.Boolean(),
    enum: Type.Optional(Type.Array(generatedFormFieldOptionSchema)),
    'x-decorator': Type.String(),
    'x-component': Type.String(),
    'x-component-props': Type.Optional(
      Type.Object({ placeholder: Type.Optional(Type.String()) }),
    ),
    'x-decorator-props': Type.Optional(
      Type.Object({ help: Type.Optional(Type.String()) }),
    ),
  }))();

export type FormilyFieldSchema = Static<typeof formilyFieldSchema>;

export const formilyFormSchema = /* @__PURE__ */ (() =>
  Type.Object(
    {
      type: Type.Literal('object'),
      properties: Type.Record(Type.String(), formilyFieldSchema),
    },
    {
      $id: 'FormilyFormSchema',
      description: 'Schema de Formily listo para renderizar.',
    },
  ))();

export type FormilyFormSchema = Static<typeof formilyFormSchema>;
