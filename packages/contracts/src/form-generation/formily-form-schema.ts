import { Type, type Static } from '@sinclair/typebox';

import { generatedFormFieldOptionSchema } from './generated-form.js';

/**
 * The Formily JSON that ends up in the database and that the front renders.
 *
 * It is the **subset** of `ISchema` this system emits, not all of `ISchema`:
 * Formily's definition is recursive and open (everything optional, everything
 * `any` in the props), which makes it unworkable as a contract. Describing only
 * what the compiler produces means the front receives a type with concrete
 * fields, and a change in the compiler breaks compilation in both apps.
 *
 * It is produced by `apps/worker` (`domain/to-formily-schema.ts`) out of the
 * validated draft; the back only stores it and serves it.
 */

// The IIFE is not decoration: without it the nested calls (`Type.String()`,
// `Type.Literal()`…) stay as arguments with unknown side effects and the
// bundler retains TypeBox even when nobody uses the schema. The full
// explanation is at the bottom of `generated-form.ts`.
const formilyFieldSchema = /* @__PURE__ */ (() =>
  Type.Object({
    /** Value type. Derived by the compiler from the `x-component`, not by the AI. */
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
      description: 'Formily schema ready to render.',
    },
  ))();

export type FormilyFormSchema = Static<typeof formilyFormSchema>;
