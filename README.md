# AI Form Creator

| App                            | Qué es                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| [`apps/front`](./apps/front)   | React 19 + Vite 8. Formularios dinámicos desde JSON Schema con [Formily](https://formilyjs.org/), arquitectura [bulletproof-react](https://github.com/alan2207/bulletproof-react/tree/master/apps/react-vite) |
| [`apps/back`](./apps/back)     | NestJS + Prisma + Postgres. Ingesta de documentos regulatorios, arquitectura hexagonal                            |

Las dos arquitecturas están **forzadas por ESLint**: romperlas falla el lint y
bloquea el commit. Lo de abajo es el front; para el backend, ver
[`apps/back/README.md`](./apps/back/README.md).

## Arranque

```bash
cd apps/front
cp .env.example .env      # ya existe un .env local listo para usar
npm install
npm run dev               # http://localhost:3000
```

Y el backend, en otra terminal:

```bash
cd apps/back
cp .env.example .env      # completar credenciales — ver HUMAN-TASK.md
npm install && npm run db:deploy
npm run dev               # http://localhost:8080 — Swagger en /docs
```

La API está mockeada con MSW (`VITE_APP_ENABLE_API_MOCKING=true`), así que la app
funciona sin backend. Rutas: `/`, `/forms`, `/forms/:formTemplateId`.

| Comando               | Qué hace                                |
| --------------------- | --------------------------------------- |
| `npm run dev`         | servidor de desarrollo                  |
| `npm run lint`        | ESLint (arquitectura, nombres, tokens)  |
| `npm run lint:fix`    | ESLint + Prettier autofix               |
| `npm run check-types` | `tsc -b`                                |
| `npm test`            | Vitest + Testing Library + MSW          |
| `npm run generate`    | Plop: scaffolding de feature/componente |
| `npm run build`       | build de producción                     |

Git hooks (husky): `pre-commit` corre lint-staged; `pre-push` corre types + tests.

Las reglas de código (nombrado, magic strings, design tokens, variant mapping)
están en [`CLAUDE.md`](./CLAUDE.md). Las tareas que requieren un humano
(credenciales, backend real) están en [`HUMAN-TASK.md`](./HUMAN-TASK.md).

## Stack

| Capa           | Elección                                           |
| -------------- | -------------------------------------------------- |
| Build          | Vite 8 + `@vitejs/plugin-react`                    |
| Formularios    | `@formily/core` + `@formily/react` (schema-driven) |
| Datos          | TanStack Query 5 + axios                           |
| Rutas          | react-router 8 (`createBrowserRouter`, lazy)       |
| Estilos        | Tailwind v4 (design tokens en `@theme`) + CVA      |
| Estado global  | Zustand (sólo notificaciones por ahora)            |
| Validación env | Zod                                                |
| Mocks          | MSW (dev + tests)                                  |
| Calidad        | ESLint 9 flat config, Prettier, Vitest, husky      |

## Cómo se fuerza la arquitectura

`eslint.config.js` lee `src/features/` **en disco** y genera las zonas
restringidas, de modo que cada feature nueva queda aislada automáticamente:

- `import-x/no-restricted-paths` + `no-restricted-imports`: prohíben imports
  entre features y garantizan el flujo `shared → features → app`.
- `check-file/*`: archivos y carpetas en `kebab-case`.
- `@typescript-eslint/naming-convention`: camelCase/PascalCase/UPPER_CASE.
- `no-restricted-syntax`: prohíbe comparar contra strings literales, rutas
  literales en `<Link to>`, claves de storage literales y `import.meta.env`
  fuera de `src/config`.
- `@typescript-eslint/no-magic-numbers`: números a `config/`.

Ejemplo real de lo que rechaza el lint:

```
error  Unexpected path "../../dynamic-form/utils/…" imported in restricted zone.
       No se permiten imports entre features.            import-x/no-restricted-paths
error  Magic string: compara contra una constante nombrada.  no-restricted-syntax
error  The filename "Bad-Example.tsx" does not match KEBAB_CASE.
                                        check-file/filename-naming-convention
```

---

# Ejemplo completo: la feature `dynamic-form`

Ésta es la feature de referencia. Renderiza **cualquier** formulario a partir del
JSON Schema que devuelve la API: no hay un componente por formulario, hay un
renderer y un catálogo de campos.

```
src/features/dynamic-form/
├── api/
│   ├── get-form-templates.ts      # lista  (queryOptions + hook)
│   ├── get-form-template.ts       # detalle (incluye el schema)
│   └── submit-form-response.ts    # mutación de envío
├── components/
│   ├── dynamic-form.tsx           # renderer: createForm + FormProvider + SchemaField
│   ├── schema-field.tsx           # Variant Mapping: 'TextField' → <TextField/>
│   ├── form-item.tsx              # decorador: label, requerido, ayuda, errores
│   ├── form-status-badge.tsx
│   ├── form-templates-list.tsx
│   ├── form-template-detail.tsx   # compone query + renderer + mutación
│   ├── fields/                    # controles conectados a Formily
│   │   ├── field-styles.ts        # CVA compartido (tokens)
│   │   ├── text-field.tsx  textarea-field.tsx  number-field.tsx
│   │   ├── select-field.tsx  radio-group-field.tsx
│   │   ├── checkbox-field.tsx  date-field.tsx
│   └── __tests__/dynamic-form.test.tsx
├── config/
│   ├── api-endpoints.ts           # URLs + query keys (cero literales fuera)
│   ├── field-components.ts        # nombres de `x-component` (el contrato)
│   ├── form-status.ts             # Variant Mapping de estados
│   └── validation-locale.ts       # mensajes de validación en español
├── types/form-template.ts
└── utils/normalize-form-values.ts
```

## Paso a paso: cómo se construyó (y cómo construir la siguiente)

### 0. Generar el esqueleto

```bash
npm run generate      # → feature → nombre: dynamic-form, entidad: form-template
```

Deja creados `config/api-endpoints.ts`, `types/`, `api/` y un componente de
lista, ya formateados. Desde ese momento ESLint impide que otra feature la
importe.

### 1. Tipos: el contrato con el backend (`types/form-template.ts`)

El schema es un dato, no código. Se tipa con `ISchema` de Formily:

```ts
import type { ISchema } from '@formily/react';

export const formTemplateStatuses = {
  draft: 'draft',
  published: 'published',
  archived: 'archived',
} as const;
export type FormTemplateStatus =
  (typeof formTemplateStatuses)[keyof typeof formTemplateStatuses];

export type FormTemplate = FormTemplateSummary & { schema: ISchema };
```

> Los estados se declaran como objeto `as const`, no como unión de strings
> sueltos: así `formTemplateStatuses.published` reemplaza a `'published'` en todo
> el código y el lint puede prohibir la comparación literal.

### 2. Configuración centralizada (`config/`)

Nada de URLs ni de nombres de componente esparcidos:

```ts
// config/api-endpoints.ts
export const dynamicFormEndpoints = {
  formTemplates: '/form-templates',
  formTemplate: (id: string) => `/form-templates/${id}`,
  formResponses: (id: string) => `/form-templates/${id}/responses`,
} as const;

export const dynamicFormQueryKeys = {
  all: ['form-templates'] as const,
  lists: () => [...dynamicFormQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...dynamicFormQueryKeys.all, 'detail', id] as const,
} as const;
```

```ts
// config/field-components.ts — el contrato entre el JSON y React
export const fieldComponentNames = {
  text: 'TextField',
  textarea: 'TextareaField',
  number: 'NumberField',
  select: 'SelectField',
  checkbox: 'CheckboxField',
  radioGroup: 'RadioGroupField',
  date: 'DateField',
} as const;
```

### 3. Capa de API (`api/`)

Un archivo por operación; función pura + `queryOptions` + hook:

```ts
export const getFormTemplate = (
  formTemplateId: string,
): Promise<FormTemplate> =>
  api.get(dynamicFormEndpoints.formTemplate(formTemplateId));

export const getFormTemplateQueryOptions = (formTemplateId: string) =>
  queryOptions({
    queryKey: dynamicFormQueryKeys.detail(formTemplateId),
    queryFn: () => getFormTemplate(formTemplateId),
  });

export const useFormTemplate = ({
  formTemplateId,
  queryConfig,
}: UseFormTemplateOptions) =>
  useQuery({ ...getFormTemplateQueryOptions(formTemplateId), ...queryConfig });
```

Separar la función de su hook permite precargar desde un `clientLoader` de ruta
(lo hace `src/app/routes/forms/forms.tsx`).

### 4. Los campos: conectar componentes propios a Formily (`components/fields/`)

Formily no impone librería de UI. `connect` inyecta `value`, `onChange`,
`disabled`; `mapProps` traduce estado del field a props del componente:

```tsx
const TextInput = ({ value, invalid, className, ...props }: TextInputProps) => (
  <input
    type="text"
    value={value ?? ''}
    className={cn(controlVariants({ invalid }), className)}
    {...props}
  />
);

export const TextField = connect(
  TextInput,
  mapProps((props, field) => ({
    ...props,
    invalid: Boolean('selfErrors' in field && field.selfErrors?.length),
  })),
);
```

Detalles que ya están resueltos:

- `select`: `mapProps({ dataSource: 'options' })` convierte el `enum` del JSON
  Schema en las `options` del `<select>`.
- `checkbox`: Formily lee `event.target.value` (que en un checkbox nativo es
  `"on"`), así que el componente emite el booleano explícitamente.
- Estilos: todo sale de `controlVariants` (CVA + design tokens), ningún valor
  crudo.

### 5. El decorador `FormItem` (`components/form-item.tsx`)

Envuelve cada campo con label, marca de requerido, ayuda y errores leyendo el
estado reactivo del field:

```tsx
export const FormItem = observer(({ children, help, className }: FormItemProps) => {
  const field = useField<Field>();
  const errors = field.selfErrors ?? [];
  …
});
```

### 6. Variant Mapping del renderer (`components/schema-field.tsx`)

El único lugar donde un string del schema se convierte en un componente. Sin
`switch`, sin `if`:

```tsx
export const SchemaField = createSchemaField({
  components: {
    [fieldDecoratorNames.formItem]: FormItem,
    [fieldComponentNames.text]: TextField,
    [fieldComponentNames.select]: SelectField,
    …
  },
});
```

**Añadir un tipo de campo nuevo** (p. ej. un slider) = 3 pasos, sin tocar nada
más: constante en `field-components.ts` → componente en `fields/` → entrada en
este mapa.

### 7. El renderer (`components/dynamic-form.tsx`)

```tsx
export const DynamicForm = ({
  schema,
  initialValues,
  isDisabled,
  onSubmit,
}: DynamicFormProps) => {
  const form = useMemo(
    () => createForm({ initialValues, editable: !isDisabled }),
    [initialValues, isDisabled],
  );

  const handleSubmit = () => {
    form.submit<FormValues>(onSubmit).catch(() => undefined); // valida antes de llamar
  };

  return (
    <FormProvider form={form}>
      <SchemaField schema={schema} />
      <Button
        onClick={handleSubmit}
        isLoading={isSubmitting}
        disabled={isDisabled}
      >
        …
      </Button>
    </FormProvider>
  );
};
```

No conoce ningún campo concreto: es reutilizable para cualquier schema.

### 8. Composición con datos (`components/form-template-detail.tsx`)

Une query + renderer + mutación, y usa el Variant Mapping de estado para decidir
si el formulario se puede enviar:

```tsx
const statusVariant = formStatusVariants[formTemplate.status];

<DynamicForm
  schema={formTemplate.schema}
  isDisabled={!statusVariant.isSubmittable}
  isSubmitting={submitFormResponse.isPending}
  onSubmit={(values) =>
    submitFormResponse.mutate({
      formTemplateId,
      values: normalizeFormValues(values),
    })
  }
/>;
```

### 9. Conectar la feature a la app (capa `app/`)

`src/config/paths.ts`:

```ts
forms: {
  root:   { path: '/forms', getHref: () => '/forms' },
  detail: { path: '/forms/:formTemplateId',
            getHref: (id: string) => `/forms/${id}` },
},
```

`src/app/routes/forms/form.tsx` — la ruta es la que importa la feature (nunca al
revés):

```tsx
const FormRoute = () => {
  const { formTemplateId } = useParams<{ formTemplateId: string }>();
  if (!formTemplateId) return null;
  return (
    <AppLayout>
      <FormTemplateDetail formTemplateId={formTemplateId} />
    </AppLayout>
  );
};
export default FormRoute;
```

y se registra en `src/app/router.tsx` con `lazy: () => import('./routes/forms/form')`.

### 10. Mocks y tests

`src/testing/mocks/data/form-templates.ts` define los schemas de ejemplo
(onboarding, encuesta NPS, borrador) y `handlers/form-templates.ts` sirve los
endpoints. Los mismos handlers alimentan Vitest, así que los tests ejercitan la
capa de API real:

```tsx
it('no envía si falta un campo requerido', async () => {
  const onSubmit = vi.fn();
  const { user } = renderApp(
    <DynamicForm schema={schema} onSubmit={onSubmit} />,
  );

  await user.click(await screen.findByRole('button', { name: 'Enviar' }));

  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});
```

## Ejemplo de schema que consume la app

```jsonc
{
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "title": "Correo electrónico",
      "required": true,
      "x-validator": "email",
      "x-decorator": "FormItem",
      "x-decorator-props": { "help": "Usaremos este correo para el acceso." },
      "x-component": "TextField",
      "x-component-props": { "placeholder": "ada@empresa.com" },
    },
    "companySize": {
      "type": "string",
      "title": "Tamaño de la empresa",
      "required": true,
      "enum": [
        { "label": "1 - 10", "value": "micro" },
        { "label": "11 - 50", "value": "small" },
      ],
      "x-decorator": "FormItem",
      "x-component": "SelectField",
    },
  },
}
```

Añadir un formulario nuevo al producto **no requiere código**: basta con un
schema nuevo (lo puede generar la IA). Sólo se escribe código cuando aparece un
tipo de campo que aún no existe.
