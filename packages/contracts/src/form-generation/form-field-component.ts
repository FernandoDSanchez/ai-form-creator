import { Type, type Static } from '@sinclair/typebox';

/**
 * The `x-component` values a Formily schema may ask for.
 *
 * This is the three-ended contract of rendering:
 *   - the front maps each name to a React component
 *     (`features/dynamic-form/components/schema-field.tsx`),
 *   - the LLM can only pick from this list (it travels in the structured
 *     output),
 *   - the worker uses it to compile the draft into Formily JSON.
 *
 * It used to live in
 * `apps/front/src/features/dynamic-form/config/field-components.ts`. It moved
 * up here when the AI became the one choosing the component: since then these
 * are literals crossing the wire, and a new component not added on both ends is
 * a form that does not render.
 */
export const formFieldComponents = {
  text: 'TextField',
  textarea: 'TextareaField',
  number: 'NumberField',
  select: 'SelectField',
  checkbox: 'CheckboxField',
  radioGroup: 'RadioGroupField',
  date: 'DateField',
} as const;

export const formFieldComponentSchema = /* @__PURE__ */ Type.Enum(
  formFieldComponents,
  {
    $id: 'FormFieldComponent',
    description: 'Component that renders the field (`x-component`).',
  },
);

export type FormFieldComponent = Static<typeof formFieldComponentSchema>;

/** Decorator (wrapper with label + error) applied to every field. */
export const formFieldDecorators = {
  formItem: 'FormItem',
} as const;

/**
 * The JSON type that corresponds to each component's value.
 *
 * Formily needs the field `type` on top of the `x-component`, and the AI is not
 * the one deciding it: it follows from the component. Making it a `Record` over
 * the enum type forces the decision whenever a new component is added.
 */
export const formFieldValueTypes: Record<
  FormFieldComponent,
  'string' | 'number' | 'boolean'
> = {
  [formFieldComponents.text]: 'string',
  [formFieldComponents.textarea]: 'string',
  [formFieldComponents.number]: 'number',
  [formFieldComponents.select]: 'string',
  [formFieldComponents.checkbox]: 'boolean',
  [formFieldComponents.radioGroup]: 'string',
  [formFieldComponents.date]: 'string',
};

/**
 * Components fed by a closed list of options.
 *
 * Structured output cannot express "`options` is required only if `component`
 * is SelectField" (JSON Schema has no conditionals that providers honour in
 * `strict` mode), so the rule is checked afterwards, in the workflow, and the
 * error goes back to the LLM as text.
 */
export const optionBackedFormFieldComponents: readonly FormFieldComponent[] = [
  formFieldComponents.select,
  formFieldComponents.radioGroup,
];
