# AI Form Creator — Guía para Claude Code

Monorepo con tres apps y un paquete compartido:

| Paquete              | Stack                            | Arquitectura                    |
| -------------------- | -------------------------------- | ------------------------------- |
| `apps/front`         | React 19 + Vite 8 + TS (Formily) | bulletproof-react               |
| `apps/back`          | NestJS 11 + Prisma 6 + Postgres  | hexagonal (puertos/adaptadores) |
| `apps/worker`        | Temporal + TS (LiteLLM, RAGFlow) | workflows/actividades + dominio |
| `packages/contracts` | TypeBox + TS                     | contratos que cruzan el cable   |

**Los cuatro están forzados por ESLint**: si rompes una regla arquitectónica, el
lint falla y el commit se bloquea (husky + lint-staged).

> **Este documento describe `apps/front`.** Las secciones 2 y 3 (nombrado,
> magic strings) aplican a los cuatro. Para el backend, la guía completa está
> en [`apps/back/README.md`](./apps/back/README.md); el resumen está en la
> sección 9. El paquete compartido está en la sección 10 y el worker en la 11.

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

Hooks de git (cubren los cuatro paquetes, `packages/contracts` primero):

- `pre-commit` → lint-staged en cada uno (eslint --fix + prettier sobre lo
  staged).
- `pre-push` → `check-types` + `test` de las tres apps, precedido por
  `check-types` + `build` del paquete de contratos. Ese build no es
  decorativo: las apps tipan contra el `dist/` del paquete, así que sin
  recompilar primero mirarían tipos viejos y darían verde en falso.

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
| Estados que comparten front y back    | `packages/contracts/` (ver §10)                      |

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
  hoy los campos coincidan uno a uno. Ese mapper es además donde el `DateTime`
  se vuelve string ISO (ver §10).
- **Si la entidad la comparte el front, no se declara acá.** Vive en
  `packages/contracts` y el archivo del dominio sólo la reexporta (§10). Que el
  contrato sea compartido no lo hace infraestructura: es un paquete sin
  framework, sin ORM y sin HTTP, así que el núcleo puede mirarlo sin romper la
  regla de dependencias hacia adentro.
- **El nombre del puerto no nombra a su proveedor**: `DocumentIngestion`, no
  `RagflowClient`. El proveedor se nombra en el adaptador.

Comandos: `npm run dev | lint | check-types | test | build | db:deploy`.
Swagger queda en `/docs`; el endpoint, bajo el prefijo `/api`.

## 10. Contratos compartidos (`packages/contracts`)

Lo que cruza la frontera HTTP se declara **una sola vez**, con
[TypeBox](https://github.com/sinclairzx81/typebox), y lo consumen las dos apps.
Si un campo cambia acá, las dos dejan de compilar hasta que se acomoden.

```
packages/contracts/src/
├── formats.ts                    # registro de formatos JSON Schema
└── <contexto>/
    ├── <entidad>.ts              # schema + tipo derivado con Static<>
    └── <entidad>-status.ts       # objeto `as const` + su schema
```

Cada contrato exporta las dos caras del mismo objeto: el **schema**
(`regulatoryDocumentSchema`, JSON Schema en runtime) y el **tipo**
(`RegulatoryDocument`, derivado con `Static<typeof …>`, nunca escrito a mano).

### Reglas

- **Un contrato sólo importa lo que el `package.json` declara como
  `dependencies`** — hoy, TypeBox. Nada de Nest, Prisma, React ni utilidades de
  una de las apps: lo que entre acá se lo comen las dos. Lo verifica
  `import-x/no-extraneous-dependencies`.
- **Las fechas viajan como string ISO 8601, no como `Date`.** Lo que cruza el
  cable es JSON; tipar `createdAt: Date` haría que el front creyera tener un
  `Date` cuando recibe un string. La conversión ocurre en un solo lugar: el
  mapper de Prisma del back.
- **Sin barrel** (igual que §1): se importa el archivo concreto por su subpath,
  `@ai-form-creator/contracts/<contexto>/<entidad>`.
- **Cada app lo expone por su propia puerta**, y el resto del código importa esa
  puerta, no el paquete:
  `apps/back/src/<contexto>/domain/<entidad>.ts` y
  `apps/front/src/features/<x>/types/<entidad>.ts` sólo reexportan.
- **Los `Type.*()` de nivel de módulo llevan `/* @__PURE__ */`.** Sin la
  anotación el bundler ve una llamada a función, la asume con efectos y se
  trae TypeBox entero al bundle del front aunque sólo se haya importado el
  objeto de estados.

  **Y la anotación sola no siempre alcanza.** `/* @__PURE__ */ f(x)` dice que
  `f` no tiene efectos, no que `x` no los tenga. Con `Type.Enum(objeto, {…})`
  basta, porque los argumentos son datos; pero un
  `Type.Object({ a: Type.String() })` tiene llamadas **adentro**, y el bundler
  descarta la de afuera y conserva las de adentro — con el import de TypeBox
  puesto. Por eso todo schema con llamadas anidadas se envuelve en una IIFE
  anotada, que convierte esos argumentos en cuerpo de función:

  ```ts
  export const algoSchema = /* @__PURE__ */ (() =>
    Type.Object({ nombre: Type.String({ minLength: 1 }) }))();
  ```

  Cómo verificarlo: `npm run build` en `apps/front` y
  `grep -l TypeBox dist/assets/*.js`. Tiene que no encontrar nada. Es la única
  forma de darse cuenta — el build no avisa, sólo pesa más.
- **Un `format` hay que registrarlo en `formats.ts`.** TypeBox no trae ninguno
  de fábrica y un formato desconocido no se ignora: `Value.Check` devuelve
  `false` con `Unknown format 'uuid'`. Los schemas importan `formats.uuid` en
  vez del literal justamente para que el registro viaje como dependencia real
  del módulo.

### Consumo

Se distribuye compilado (`dist/`, ignorado por git) en CJS y ESM a la vez: el
back es CommonJS y el front es ESM. Las apps lo declaran con
`"@ai-form-creator/contracts": "file:../../packages/contracts"`, y npm lo enlaza
por symlink — un `npm run build` en el paquete se ve al toque desde las apps.

**En un clone nuevo hay que compilarlo antes de tocar las apps.** Desde
`apps/back` hay atajo: `npm run contracts:build`. A propósito no hay script
`prepare`: npm lo correría durante el `npm install` de la app que enlaza el
paquete, cuando las devDependencies de acá todavía no existen, y el install
fallaría con un `tsc: not found` bastante opaco.

⚠️ Las imágenes Docker de las dos apps se construyen **desde la raíz del repo**
(`docker build -f apps/<x>/Dockerfile .`), no desde la carpeta de la app: la
dependencia `file:` queda fuera de un contexto más angosto. Y el
`node_modules` del paquete viaja a la imagen, porque npm resuelve el symlink a
su ruta real y los imports que salen de `packages/contracts/dist/**` se buscan
desde ahí, no desde el `node_modules` de la app.

### Validar en runtime: `@ai-form-creator/contracts/validation`

Si una app necesita `Value.Check`, **importa el `Value` de ese subpath**, no de
`@sinclair/typebox/value`. `FormatRegistry` es un singleton por copia del
módulo, y en este monorepo hay más de una (el paquete declara TypeBox como
dependencia propia; las apps que lo enlazan por `file:` terminan con otra
hoisteada). Con la copia equivocada, `Value.Check` devuelve `false` con
`Unknown format 'uuid'` sobre documentos perfectamente válidos, sin tirar
ningún error. Ese subpath exporta el `Value` de la misma copia que corrió
`FormatRegistry.Set`.

### Agregar un contrato

1. Creá `src/<contexto>/<entidad>.ts` con el schema y su `Static<>`.
2. `npm run lint && npm run check-types && npm run build`.
3. Reexportalo desde la puerta de cada app que lo use. El wildcard de `exports`
   ya cubre el subpath: no hay que tocar el `package.json`.

### Contratos que no son HTTP

`form-generation/` declara también lo que cruza los **otros dos cables** del
sistema, y por el mismo motivo: son fronteras entre procesos que se rompen
calladas.

- `form-generation-workflow.ts` — la cola de Temporal, el nombre del workflow,
  las señales y el argumento de arranque. Si el back encola en
  `'form-generation'` y el worker escucha `'form-generations'`, nadie falla,
  nadie loguea nada, y el workflow se queda encolado para siempre.
- `form-generation-event.ts` — el namespace, el path y los nombres de evento del
  WebSocket, más el canal de `LISTEN`/`NOTIFY` de Postgres. Un nombre de evento
  que no coincida entre el `emit` y el `on` deja al front esperando.

## 11. Worker de Temporal (`apps/worker`)

El único proceso que le habla al modelo y el único que mueve el estado de una
generación. No escucha en ningún puerto: toma trabajo de la cola
`form-generation` y escribe en `app-postgres`. La guía completa está en
[`apps/worker/README.md`](./apps/worker/README.md).

```
src/
├── config/       # env + ajustes de adaptadores. Sólo lo leen worker.ts y activities/
├── domain/       # puro: prompt, validación, compilador a Formily. CERO IO
│   └── ports/    # lo que el workflow necesita del mundo, declarado como tipo
├── activities/   # el único lugar con red y base de datos
├── workflows/    # determinista; sólo orquesta
└── worker.ts     # raíz de composición
```

| Desde ↓ / Hacia →| `domain` | `activities` | `config` | `pg`, `node:*`, `@temporalio/worker` |
| ---------------- | :------: | :----------: | :------: | :---------------------------------: |
| `domain`         |    ✅    |      ❌      |    ❌    |                 ❌                  |
| `workflows`      |    ✅    |      ❌      |    ❌    |                 ❌                  |
| `activities`     |    ✅    |      ✅      |    ✅    |                 ✅                  |

**Estas reglas no son estéticas: se las impone Temporal.** El código de un
workflow corre en un sandbox determinista y se reejecuta de cero cada vez que el
worker se reinicia. No hay red, ni disco, ni `process.env`, y cualquier cosa que
dé un resultado distinto en la segunda corrida rompe la ejecución — no al
compilar, sino en producción, en una reejecución, con un `Nondeterminism error`.

Al añadir código, respeta esto:

- **El workflow no importa actividades.** Habla con ellas por el puerto de
  `domain/ports/` que resuelve `proxyActivities`. Es la misma inversión de
  dependencias que el back.
- **Lo que se reejecuta no puede cambiar de opinión.** Si una función pura
  decide un camino del workflow y su resultado podría cambiar con un despliegue,
  va envuelta en una actividad: el resultado de una actividad queda grabado en
  el historial y se relee, no se recalcula. Es el caso de
  `validateFormDraft` — el workflow espera hasta 30 días por una revisión
  humana, y en 30 días se despliega código nuevo.
- **El reintento por schema inválido vive en el workflow, no en la política de
  reintentos de Temporal.** Esta última reejecuta la misma actividad con los
  mismos argumentos; el bucle de reparación necesita reescribir el prompt con
  los errores adentro.
- **El worker no lee la base.** Todo lo que necesita se lo pasa el back en el
  argumento del workflow. Sus únicas sentencias son escrituras de estado, y
  viven todas en `activities/form-generation-store.ts`.
- **El esquema de la base no es de acá.** Lo gobierna
  `apps/back/prisma/schema.prisma` y las migraciones las corre el back.

⚠️ **La imagen del worker no es Alpine.** El SDK de Temporal trae su núcleo en
Rust como binario nativo y sólo publica prebuilds para glibc. Sobre musl la
imagen construye entera y revienta al arrancar. Usa `node:24-bookworm-slim`.

### El camino completo de una generación

```
front (prompt + documentos)
  └► POST /api/form-generations
       └► back: valida documentos, escribe fila en PENDING, encola el workflow
            └► worker: RETRIEVING → GENERATING → VALIDATING → (REPAIRING ×3)
                        └► AWAITING_REVIEW   ← se detiene, siempre
                             └► señal `review` (la manda el back)
                                  └► APPROVED / REJECTED

cada cambio de estado ─► UPDATE ─► trigger ─► pg_notify ─► back (LISTEN)
                                                       └─► WebSocket ─► front
```

**La IA nunca publica sola.** Toda generación se detiene en `AWAITING_REVIEW`
hasta que una persona decide, y la única transición hacia `APPROVED` sale de
ahí. Lo sostienen tres cosas: el `condition` del workflow, el 409 del caso de
uso `ReviewFormGeneration`, y que el puerto del repositorio del back **no tenga
un `update`** — el back no escribe estados, sólo el worker.

El `pg_notify` lleva sólo el id y el estado, no la fila: el payload tiene un
tope duro de 8 KB y el schema de Formily lo pasa con cualquier formulario
mediano. El back relee por id y publica la entidad ya mapeada.
