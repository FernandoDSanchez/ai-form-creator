/**
 * La puerta de la feature al vocabulario de componentes.
 *
 * La lista ya no se declara acá: vive en `@ai-form-creator/contracts`, porque
 * desde que la IA es quien elige el `x-component` son literales que cruzan el
 * cable. El worker sólo puede emitir estos nombres (los valida el structured
 * output) y este renderer sólo sabe dibujar estos. Un componente nuevo que se
 * agregue de un lado y no del otro es un formulario que no renderiza.
 *
 * Se reexportan valores y no sólo tipos, a diferencia de la puerta de
 * `regulatory-documents`: estos nombres se usan en runtime como claves del
 * mapa de `schema-field.tsx`. Son objetos planos, así que no arrastran TypeBox
 * al bundle — el `@__PURE__` de los schemas se encarga de que los `Type.*` que
 * viven en el mismo módulo se descarten.
 */
export {
  formFieldComponents,
  formFieldDecorators,
  formFieldValueTypes,
  type FormFieldComponent,
} from '@ai-form-creator/contracts/form-generation/form-field-component';
