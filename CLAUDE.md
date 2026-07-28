# AI Form Creator — Guía para Claude Code

Monorepo con dos apps:

| App          | Stack                             | Arquitectura                    |
| ------------ | --------------------------------- | ------------------------------- |
| `apps/front` | React 19 + Vite 8 + TS (Formily)  | bulletproof-react               |
| `apps/back`  | NestJS 11 + Prisma 6 + Postgres   | hexagonal (puertos/adaptadores) |

**Las dos están forzadas por ESLint**: si rompes una regla arquitectónica, el
lint falla y el commit se bloquea (husky + lint-staged).

> **Este documento describe `apps/front`.** Las secciones 2 y 3 (nombrado,
> magic strings) aplican a las dos apps. Para el backend, la guía completa está
> en [`apps/back/README.md`](./apps/back/README.md); el resumen está al final,
> en la sección 9.

> Nota: la carpeta `ragflow/` es un checkout independiente (stack RAGFlow local),
> no forma parte de estas apps. Está ignorada por git, ESLint, Prettier y Vitest.

## Comandos

Los comandos de abajo son de `apps/front` (correr desde ahí).

| Comando               | Qué hace                                         |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | Vite en http://localhost:3000 (API mockeada MSW) |
| `npm run lint`        | ESLint con 0 tolerancia a warnings               |
| `npm run lint:fix`    | ESLint + Prettier autofix                        |
| `npm run check-types` | `tsc -b`                                         |
| `npm test`            | Vitest (jsdom + MSW + Testing Library)           |
| `npm run generate`    | Plop: genera feature o componente                |
| `npm run build`       | Typecheck + build de producción                  |

Hooks de git: `pre-commit` → lint-staged (eslint --fix + prettier sobre lo
staged). `pre-push` → `check-types` + `test`.

## 1. Arquitectura (obligatoria)

```
src/
├── app/           # capa de aplicación: rutas, router, providers
│   └── routes/    # cada archivo = una ruta; compone features
├── components/    # UI compartida (ui/, layouts/, errors/)
├── config/        # configuración centralizada (env, paths, tokens, constantes)
├── features/      # módulos por feature — el 90% del código vive aquí
├── hooks/         # hooks compartidos
├── lib/           # librerías preconfiguradas (api-client, react-query)
├── testing/       # mocks MSW, utilidades de test
├── types/         # tipos compartidos
└── utils/         # utilidades puras compartidas
```

Una feature (`src/features/<nombre>/`) puede tener: `api/`, `components/`,
`config/`, `hooks/`, `stores/`, `types/`, `utils/`, `assets/`. Usa sólo las que
necesites. Nada de barrel files (`index.ts` que reexporta todo): rompen el tree
shaking de Vite. Importa el archivo concreto.

### Reglas de dependencia (verificadas por ESLint)

Flujo unidireccional: **shared → features → app**.

| Desde ↓ / Hacia → | `components`,`hooks`,`lib`,`utils`,`types`,`config` | `features/x` | `features/y` | `app` |
| ----------------- | :-------------------------------------------------: | :----------: | :----------: | :---: |
| shared            |                         ✅                          |      ❌      |      ❌      |  ❌   |
| `features/x`      |                         ✅                          |      ✅      |      ❌      |  ❌   |
| `app`             |                         ✅                          |      ✅      |      ✅      |  ✅   |

- Dos features **nunca** se importan entre sí. Si necesitas combinarlas, hazlo
  en `src/app/routes/*`, pasando datos por props.
- Las zonas se generan solas: `eslint.config.js` lee `src/features/` en disco,
  así que una feature nueva queda protegida sin tocar la config.
- Excepciones: `src/main.tsx` (composition root) y `src/testing/**` (mocks).

Reglas activas: `import-x/no-restricted-paths`, `no-restricted-imports`,
`import-x/no-cycle`, `import-x/order`.

## 2. Nombrado

### Archivos y carpetas — `kebab-case` siempre

Verificado por `check-file/filename-naming-convention` y
`check-file/folder-naming-convention`.

```
✅ form-template-detail.tsx   ✅ use-form-draft.ts   ✅ __tests__/
❌ FormTemplateDetail.tsx     ❌ useFormDraft.ts     ❌ formTemplates/
```

El nombre del archivo describe **qué exporta**, no su tipo genérico:
`get-form-template.ts`, no `api.ts`; `form-status.ts`, no `constants.ts`.

### Símbolos (`@typescript-eslint/naming-convention`)

| Elemento                         | Formato                  | Ejemplo                          |
| -------------------------------- | ------------------------ | -------------------------------- |
| Variables, funciones, props      | `camelCase`              | `formTemplateId`, `handleSubmit` |
| Componentes React y tipos        | `PascalCase`             | `DynamicForm`, `FormTemplate`    |
| Constantes de módulo (escalares) | `UPPER_CASE`             | `DEV_SERVER_PORT`                |
| Mapas/objetos de configuración   | `camelCase` + `as const` | `formStatusVariants`             |
| Miembros de enum                 | `UPPER_CASE`             | (preferimos objetos `as const`)  |

Convenciones de vocabulario, respétalas al añadir código:

- Booleanos: `is` / `has` / `can` / `should` → `isSubmitting`, `hasErrors`.
- Handlers: `handleX` en quien lo define, `onX` en la prop que lo recibe.
- Hooks de datos: `useX` para queries, `useSubmitX` / `useCreateX` para mutaciones.
- Funciones de API: el verbo HTTP en el nombre → `getFormTemplate`,
  `submitFormResponse`.
- Ids: `<entidad>Id` (`formTemplateId`), nunca `id` suelto al cruzar capas.
- Listas: plural (`formTemplates`); nunca `data`, `item`, `obj`, `tmp`, `foo`.
- Tipos de entidad en singular (`FormTemplate`); `XProps` para props de
  componentes; `XInput` para el payload de una mutación.

## 3. Nada de magic strings ni magic numbers

Reglas activas: `no-restricted-syntax` y `@typescript-eslint/no-magic-numbers`
(se permiten `-1, 0, 1, 2`, índices de array y valores por defecto).

Prohibido (falla el lint):

```tsx
if (status === 'published') {}          // ❌ magic string en comparación
<Link to="/forms/123">                  // ❌ ruta literal
localStorage.getItem('afc:theme')       // ❌ clave literal
setTimeout(fn, 5000)                    // ❌ número mágico
import.meta.env.VITE_APP_API_URL        // ❌ env fuera de src/config
```

Correcto:

```tsx
if (status === formTemplateStatuses.published) {}
<Link to={paths.forms.detail.getHref(formTemplateId)}>
localStorage.getItem(storageKeys.theme)
setTimeout(fn, uiConfig.notificationTimeoutMs)
env.API_URL
```

**Dónde vive cada literal** (Configuración Centralizada):

| Tipo de valor                         | Archivo                                              |
| ------------------------------------- | ---------------------------------------------------- |
| Variables de entorno                  | `src/config/env.ts` (validado con zod)               |
| Rutas de la app                       | `src/config/paths.ts`                                |
| Timeouts, límites, nombre, locale     | `src/config/app-config.ts`                           |
| Claves de storage                     | `src/config/storage-keys.ts`                         |
| Variantes compartidas                 | `src/config/ui-variants.ts`                          |
| Tokens visuales                       | `src/styles/index.css` (+ `config/design-tokens.ts`) |
| Endpoints y query keys de una feature | `src/features/<x>/config/api-endpoints.ts`           |
| Estados/variantes de una feature      | `src/features/<x>/config/*.ts`                       |

Regla práctica: **un literal que aparece dos veces, o que un no-autor no
entendería, se nombra**. Los textos de UI en JSX sí pueden ser literales (aún no
hay i18n); si se añade i18n, pasan a claves de traducción.

## 4. Design Tokens

Los valores visuales viven **una sola vez**, en `@theme` dentro de
`src/styles/index.css`. Tailwind v4 genera las utilidades desde ahí.

```
--color-brand-600  → bg-brand-600 / text-brand-600 / border-brand-600
--color-surface    → bg-surface        --color-content-muted → text-content-muted
--spacing-md       → p-md / gap-md / mt-md / px-md
--radius-lg        → rounded-lg        --shadow-card → shadow-card
--container-page   → max-w-page
```

Prohibido en componentes: valores crudos o arbitrarios
(`p-[16px]`, `text-[#4f46e5]`, `style={{ padding: 16 }}`). Si falta un valor,
**añade el token**, no el literal.

Colores semánticos antes que colores de paleta: usa `bg-surface`,
`text-content-muted`, `border-danger` en vez de `bg-white`, `text-gray-500`.
Así un cambio de tema es una edición de tokens, no un barrido de componentes.

⚠️ **Colisión conocida**: los nombres de `--spacing-*` (sm, md, lg, 2xl…) tienen
prioridad sobre la escala `--container-*` en utilidades de ancho. `max-w-sm`
resolvería a `0.5rem`, no a `24rem`. Por eso los anchos usan tokens con nombre
propio: `max-w-page`, `max-w-prose`, `max-w-toast`. **Nunca escribas
`max-w-sm` / `max-w-2xl` / `w-md`** en este proyecto.

Para JS/inline styles usa `src/config/design-tokens.ts`, que exporta referencias
`var(--token)` — nunca copies el valor hex/rem a TypeScript.

## 5. Variant Mapping (nada de `if/else` por estado)

Cuando un componente tiene estados o variantes, mapea **estado → configuración**
en un objeto tipado. Añadir una variante es añadir una fila, y TypeScript exige
cubrir todos los casos gracias a `Record<Variante, …>`.

Variantes de estilo → `class-variance-authority`:

```tsx
// src/components/ui/button/button.tsx
export const buttonVariants = cva('inline-flex items-center …', {
  variants: {
    variant: { primary: 'bg-brand-600 …', secondary: '…', danger: '…' },
    size: { sm: 'h-8 px-sm', md: 'h-10 px-md', lg: 'h-12 px-lg' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
```

Variantes de comportamiento/datos → `Record` explícito:

```tsx
// src/features/dynamic-form/config/form-status.ts
export const formStatusVariants: Record<
  FormTemplateStatus,
  { label: string; className: string; isSubmittable: boolean }
> = {
  draft: { label: 'Borrador', className: '…', isSubmittable: false },
  published: { label: 'Publicado', className: '…', isSubmittable: true },
  archived: { label: 'Archivado', className: '…', isSubmittable: false },
};

// Uso: sin condicionales
const variant = formStatusVariants[status];
```

El mismo patrón mapea strings del schema a componentes React:
`src/features/dynamic-form/components/schema-field.tsx`.

## 6. Capa de datos

- Todo HTTP pasa por `src/lib/api-client.ts` (axios; devuelve `response.data`,
  muestra un toast en error, timeout desde `httpConfig`).
- Cada llamada vive en `src/features/<x>/api/<verbo>-<entidad>.ts` y exporta:
  la función pura, sus `queryOptions` y el hook (`useX` / `useSubmitX`).
- Query keys y URLs sólo desde `config/api-endpoints.ts` de la feature.
- En desarrollo y en tests la API está mockeada con MSW
  (`src/testing/mocks/`). `VITE_APP_ENABLE_API_MOCKING=false` la desactiva.

## 7. Tests

Vitest + Testing Library + MSW. Los tests viven en `__tests__/` junto al código.
Renderiza con `renderApp` de `src/testing/test-utils.tsx` (trae QueryClient y
Router). Consulta por rol/texto accesible, no por clases CSS.

## 8. Añadir una feature nueva

```bash
npm run generate   # → feature
```

1. El generador crea `config/`, `types/`, `api/` y `components/` de la feature.
2. Añade la ruta en `src/config/paths.ts`.
3. Crea `src/app/routes/<x>.tsx` (export default + `clientLoader` opcional) y
   regístrala en `src/app/router.tsx`.
4. Añade handlers de mock en `src/testing/mocks/handlers/`.
5. `npm run lint && npm run check-types && npm test`.

Ver `README.md` para el ejemplo completo, paso a paso, con la feature
`dynamic-form` (Formily) como referencia.

## 9. Backend (`apps/back`) — arquitectura hexagonal

NestJS + Prisma + Postgres. Las convenciones de nombrado (§2) y la prohibición
de magic strings (§3) valen igual acá; lo que cambia es la forma de las capas.

```
src/<contexto>/
├── domain/          # núcleo. CERO imports de Nest, Prisma, Express o HTTP
│   ├── <entidad>.ts, <entidad>-status.ts, errors/
│   └── ports/       # lo que el núcleo necesita del mundo (interfaces + token)
├── application/     # casos de uso. Clases planas, SIN @Injectable()
└── infrastructure/  # adaptadores que tapan los puertos
    ├── http/            controlador, DTOs, filtro de errores
    ├── persistence/     Prisma + mapper fila↔entidad
    └── <externo>/       clientes de servicios de afuera
```

**Regla única, verificada por ESLint**: las dependencias apuntan hacia adentro.

| Desde ↓ / Hacia →| `domain` | `application` | `infrastructure` | `@nestjs/*`, `@prisma/client` |
| ---------------- | :------: | :-----------: | :--------------: | :---------------------------: |
| `domain`         |    ✅    |      ❌       |        ❌        |              ❌               |
| `application`    |    ✅    |      ✅       |        ❌        |              ❌               |
| `infrastructure` |    ✅    |      ✅       |        ✅        |              ✅               |

Reglas activas: `import-x/no-restricted-paths` (zonas generadas leyendo `src/`
en disco: cualquier carpeta con un `domain/` adentro queda protegida sola) y
`no-restricted-imports` (paquetes del framework).

Al añadir código, respeta esto:

- **Nada entra al dominio por la ventana.** Si el núcleo necesita algo de
  afuera (una base, una API, una cola), se declara un `type` en
  `domain/ports/` junto a un `Symbol` como token de inyección. El adaptador
  vive en `infrastructure/` y **el módulo de Nest es el único que los une**.
- **Los casos de uso no llevan decoradores.** Se registran con `useFactory` +
  `inject: [TOKEN, …]`. Así su test se escribe con dobles y sin `Test.createTestingModule`.
- **El dominio lanza errores propios, no `HttpException`.** La traducción a
  código HTTP es responsabilidad de `infrastructure/http/domain-exception.filter.ts`.
- **Prisma no cruza a dominio.** Entre la fila y la entidad hay un mapper, aunque
  hoy los campos coincidan uno a uno.
- **El nombre del puerto no nombra a su proveedor**: `DocumentIngestion`, no
  `RagflowClient`. El proveedor se nombra en el adaptador.

Comandos: `npm run dev | lint | check-types | test | build | db:deploy`.
Swagger queda en `/docs`; el endpoint, bajo el prefijo `/api`.
