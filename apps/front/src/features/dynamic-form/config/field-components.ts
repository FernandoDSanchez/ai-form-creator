/**
 * The feature's door to the component vocabulary.
 *
 * The list is no longer declared here: it lives in
 * `@ai-form-creator/contracts`, because ever since the AI is the one choosing
 * the `x-component` these are literals crossing the wire. The worker can only
 * emit these names (the structured output validates them) and this renderer
 * only knows how to draw these. A new component added on one side and not on
 * the other is a form that does not render.
 *
 * Values are re-exported and not only types, unlike the `regulatory-documents`
 * door: these names are used at runtime as keys of the `schema-field.tsx` map.
 * They are plain objects, so they do not drag TypeBox into the bundle — the
 * `@__PURE__` on the schemas takes care of the `Type.*` calls living in the
 * same module being dropped.
 */
export {
  formFieldComponents,
  formFieldDecorators,
  formFieldValueTypes,
  type FormFieldComponent,
} from '@ai-form-creator/contracts/form-generation/form-field-component';
