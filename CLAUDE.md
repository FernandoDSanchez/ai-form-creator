# AI Form Creator — Guide for Claude Code

Monorepo with three apps and one shared package:

| Package              | Stack                            | Architecture                    |
| -------------------- | -------------------------------- | ------------------------------- |
| `apps/front`         | React 19 + Vite 8 + TS (Formily) | bulletproof-react               |
| `apps/back`          | NestJS 11 + Prisma 6 + Postgres  | hexagonal (ports/adapters)      |
| `apps/worker`        | Temporal + TS (LiteLLM, RAGFlow) | workflows/activities + domain   |
| `packages/contracts` | TypeBox + TS                     | contracts crossing the wire     |

**All four are enforced by ESLint**: if you break an architectural rule, the
lint fails and the commit is blocked (husky + lint-staged).

> **This document describes `apps/front`.** Sections 2 and 3 (naming, magic
> strings) apply to all four. For the backend, the full guide is in
> [`apps/back/README.md`](./apps/back/README.md); the summary is in section 9.
> The shared package is in section 10 and the worker in section 11.

> Note: the `ragflow/` folder is an independent checkout (local RAGFlow stack),
> it is not part of these apps. It is ignored by git, ESLint, Prettier and
> Vitest.

## Commands

The commands below belong to `apps/front` (run them from there).

| Command               | What it does                                     |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | Vite on http://localhost:3000 (MSW-mocked API)   |
| `npm run lint`        | ESLint with zero tolerance for warnings          |
| `npm run lint:fix`    | ESLint + Prettier autofix                        |
| `npm run check-types` | `tsc -b`                                         |
| `npm test`            | Vitest (jsdom + MSW + Testing Library)           |
| `npm run generate`    | Plop: generates a feature or a component         |
| `npm run build`       | Typecheck + production build                     |

Git hooks (they cover all four packages, `packages/contracts` first):

- `pre-commit` → lint-staged in each one (eslint --fix + prettier over what is
  staged).
- `pre-push` → `check-types` + `test` of the three apps, preceded by
  `check-types` + `build` of the contracts package. That build is not
  decorative: the apps type against the package `dist/`, so without rebuilding
  first they would look at stale types and go green for the wrong reason.

## 1. Architecture (mandatory)

```
src/
├── app/           # application layer: routes, router, providers
│   └── routes/    # each file = one route; composes features
├── components/    # shared UI (ui/, layouts/, errors/)
├── config/        # centralized configuration (env, paths, tokens, constants)
├── features/      # per-feature modules — 90% of the code lives here
├── hooks/         # shared hooks
├── lib/           # preconfigured libraries (api-client, react-query)
├── testing/       # MSW mocks, test utilities
├── types/         # shared types
└── utils/         # shared pure utilities
```

A feature (`src/features/<name>/`) may have: `api/`, `components/`, `config/`,
`hooks/`, `stores/`, `types/`, `utils/`, `assets/`. Use only the ones you need.
No barrel files (an `index.ts` re-exporting everything): they break Vite's tree
shaking. Import the concrete file.

### Dependency rules (verified by ESLint)

Unidirectional flow: **shared → features → app**.

| From ↓ / To →     | `components`,`hooks`,`lib`,`utils`,`types`,`config` | `features/x` | `features/y` | `app` |
| ----------------- | :-------------------------------------------------: | :----------: | :----------: | :---: |
| shared            |                         ✅                          |      ❌      |      ❌      |  ❌   |
| `features/x`      |                         ✅                          |      ✅      |      ❌      |  ❌   |
| `app`             |                         ✅                          |      ✅      |      ✅      |  ✅   |

- Two features **never** import each other. If you need to combine them, do it
  in `src/app/routes/*`, passing data through props.
- The zones generate themselves: `eslint.config.js` reads `src/features/` from
  disk, so a new feature is protected without touching the config.
- Exceptions: `src/main.tsx` (composition root) and `src/testing/**` (mocks).

Active rules: `import-x/no-restricted-paths`, `no-restricted-imports`,
`import-x/no-cycle`, `import-x/order`.

## 2. Naming

### Files and folders — always `kebab-case`

Verified by `check-file/filename-naming-convention` and
`check-file/folder-naming-convention`.

```
✅ form-template-detail.tsx   ✅ use-form-draft.ts   ✅ __tests__/
❌ FormTemplateDetail.tsx     ❌ useFormDraft.ts     ❌ formTemplates/
```

The file name describes **what it exports**, not its generic type:
`get-form-template.ts`, not `api.ts`; `form-status.ts`, not `constants.ts`.

### Symbols (`@typescript-eslint/naming-convention`)

| Element                          | Format                   | Example                          |
| -------------------------------- | ------------------------ | -------------------------------- |
| Variables, functions, props      | `camelCase`              | `formTemplateId`, `handleSubmit` |
| React components and types       | `PascalCase`             | `DynamicForm`, `FormTemplate`    |
| Module constants (scalars)       | `UPPER_CASE`             | `DEV_SERVER_PORT`                |
| Configuration maps/objects       | `camelCase` + `as const` | `formStatusVariants`             |
| Enum members                     | `UPPER_CASE`             | (we prefer `as const` objects)   |

Vocabulary conventions, respect them when adding code:

- Booleans: `is` / `has` / `can` / `should` → `isSubmitting`, `hasErrors`.
- Handlers: `handleX` in whoever defines it, `onX` in the prop receiving it.
- Data hooks: `useX` for queries, `useSubmitX` / `useCreateX` for mutations.
- API functions: the HTTP verb in the name → `getFormTemplate`,
  `submitFormResponse`.
- Ids: `<entity>Id` (`formTemplateId`), never a bare `id` when crossing layers.
- Lists: plural (`formTemplates`); never `data`, `item`, `obj`, `tmp`, `foo`.
- Entity types in the singular (`FormTemplate`); `XProps` for component props;
  `XInput` for a mutation payload.

## 3. No magic strings and no magic numbers

Active rules: `no-restricted-syntax` and `@typescript-eslint/no-magic-numbers`
(`-1, 0, 1, 2`, array indexes and default values are allowed).

Forbidden (fails the lint):

```tsx
if (status === 'published') {}          // ❌ magic string in a comparison
<Link to="/forms/123">                  // ❌ literal route
localStorage.getItem('afc:theme')       // ❌ literal key
setTimeout(fn, 5000)                    // ❌ magic number
import.meta.env.VITE_APP_API_URL        // ❌ env outside src/config
```

Correct:

```tsx
if (status === formTemplateStatuses.published) {}
<Link to={paths.forms.detail.getHref(formTemplateId)}>
localStorage.getItem(storageKeys.theme)
setTimeout(fn, uiConfig.notificationTimeoutMs)
env.API_URL
```

**Where each literal lives** (Centralized Configuration):

| Kind of value                        | File                                                 |
| ------------------------------------ | ---------------------------------------------------- |
| Environment variables                | `src/config/env.ts` (validated with zod)             |
| App routes                           | `src/config/paths.ts`                                |
| Timeouts, limits, name, locale       | `src/config/app-config.ts`                           |
| Storage keys                         | `src/config/storage-keys.ts`                         |
| Shared variants                      | `src/config/ui-variants.ts`                          |
| Visual tokens                        | `src/styles/index.css` (+ `config/design-tokens.ts`) |
| A feature's endpoints and query keys | `src/features/<x>/config/api-endpoints.ts`           |
| A feature's statuses/variants        | `src/features/<x>/config/*.ts`                       |
| Statuses shared by front and back    | `packages/contracts/` (see §10)                      |

Practical rule: **a literal that shows up twice, or that a non-author would not
understand, gets a name**. UI text in JSX may be literal (there is no i18n yet);
if i18n is added, they become translation keys.

## 4. Design Tokens

Visual values live **exactly once**, in `@theme` inside `src/styles/index.css`.
Tailwind v4 generates the utilities from there.

```
--color-brand-600  → bg-brand-600 / text-brand-600 / border-brand-600
--color-surface    → bg-surface        --color-content-muted → text-content-muted
--spacing-md       → p-md / gap-md / mt-md / px-md
--radius-lg        → rounded-lg        --shadow-card → shadow-card
--container-page   → max-w-page
```

Forbidden in components: raw or arbitrary values (`p-[16px]`, `text-[#4f46e5]`,
`style={{ padding: 16 }}`). If a value is missing, **add the token**, not the
literal.

Semantic colours before palette colours: use `bg-surface`, `text-content-muted`,
`border-danger` instead of `bg-white`, `text-gray-500`. That way a theme change
is a token edit, not a sweep across components.

⚠️ **Known collision**: the `--spacing-*` names (sm, md, lg, 2xl…) take priority
over the `--container-*` scale in width utilities. `max-w-sm` would resolve to
`0.5rem`, not `24rem`. That is why widths use tokens with names of their own:
`max-w-page`, `max-w-prose`, `max-w-toast`. **Never write `max-w-sm` /
`max-w-2xl` / `w-md`** in this project.

For JS/inline styles use `src/config/design-tokens.ts`, which exports
`var(--token)` references — never copy the hex/rem value into TypeScript.

## 5. Variant Mapping (no `if/else` per state)

When a component has states or variants, map **state → configuration** in a
typed object. Adding a variant is adding a row, and TypeScript demands covering
every case thanks to `Record<Variant, …>`.

Style variants → `class-variance-authority`:

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

Behaviour/data variants → an explicit `Record`:

```tsx
// src/features/dynamic-form/config/form-status.ts
export const formStatusVariants: Record<
  FormTemplateStatus,
  { label: string; className: string; isSubmittable: boolean }
> = {
  draft: { label: 'Draft', className: '…', isSubmittable: false },
  published: { label: 'Published', className: '…', isSubmittable: true },
  archived: { label: 'Archived', className: '…', isSubmittable: false },
};

// Usage: no conditionals
const variant = formStatusVariants[status];
```

The same pattern maps schema strings to React components:
`src/features/dynamic-form/components/schema-field.tsx`.

## 6. Data layer

- All HTTP goes through `src/lib/api-client.ts` (axios; it returns
  `response.data`, shows a toast on error, timeout from `httpConfig`).
- Every call lives in `src/features/<x>/api/<verb>-<entity>.ts` and exports: the
  pure function, its `queryOptions` and the hook (`useX` / `useSubmitX`).
- Query keys and URLs only from the feature's `config/api-endpoints.ts`.
- In development and in tests the API is mocked with MSW
  (`src/testing/mocks/`). `VITE_APP_ENABLE_API_MOCKING=false` turns it off.

## 7. Tests

Vitest + Testing Library + MSW. Tests live in `__tests__/` next to the code.
Render with `renderApp` from `src/testing/test-utils.tsx` (it brings the
QueryClient and the Router). Query by role/accessible text, not by CSS classes.

## 8. Adding a new feature

```bash
npm run generate   # → feature
```

1. The generator creates the feature's `config/`, `types/`, `api/` and
   `components/`.
2. Add the route in `src/config/paths.ts`.
3. Create `src/app/routes/<x>.tsx` (default export + optional `clientLoader`)
   and register it in `src/app/router.tsx`.
4. Add mock handlers in `src/testing/mocks/handlers/`.
5. `npm run lint && npm run check-types && npm test`.

See `README.md` for the complete step-by-step example, with the `dynamic-form`
feature (Formily) as the reference.

## 9. Backend (`apps/back`) — hexagonal architecture

NestJS + Prisma + Postgres. The naming conventions (§2) and the ban on magic
strings (§3) hold here too; what changes is the shape of the layers.

```
src/<context>/
├── domain/          # core. ZERO imports of Nest, Prisma, Express or HTTP
│   ├── <entity>.ts, <entity>-status.ts, errors/
│   └── ports/       # what the core needs from the world (interfaces + token)
├── application/     # use cases. Plain classes, WITHOUT @Injectable()
└── infrastructure/  # adapters covering the ports
    ├── http/            controller, DTOs, error filter
    ├── persistence/     Prisma + row↔entity mapper
    └── <external>/      clients of outside services
```

**A single rule, verified by ESLint**: dependencies point inwards.

| From ↓ / To →    | `domain` | `application` | `infrastructure` | `@nestjs/*`, `@prisma/client` |
| ---------------- | :------: | :-----------: | :--------------: | :---------------------------: |
| `domain`         |    ✅    |      ❌       |        ❌        |              ❌               |
| `application`    |    ✅    |      ✅       |        ❌        |              ❌               |
| `infrastructure` |    ✅    |      ✅       |        ✅        |              ✅               |

Active rules: `import-x/no-restricted-paths` (zones generated by reading `src/`
from disk: any folder with a `domain/` inside it is protected on its own) and
`no-restricted-imports` (framework packages).

When adding code, respect this:

- **Nothing gets into the domain through the window.** If the core needs
  something from outside (a database, an API, a queue), a `type` is declared in
  `domain/ports/` next to a `Symbol` as the injection token. The adapter lives
  in `infrastructure/` and **the Nest module is the only thing joining them**.
- **Use cases carry no decorators.** They are registered with `useFactory` +
  `inject: [TOKEN, …]`. That way their test is written with doubles and without
  `Test.createTestingModule`.
- **The domain throws its own errors, not `HttpException`.** Translating into an
  HTTP code is the responsibility of
  `infrastructure/http/domain-exception.filter.ts`.
- **Prisma does not cross into the domain.** Between the row and the entity
  there is a mapper, even when today the fields match one to one. That mapper is
  also where the `DateTime` becomes an ISO string (see §10).
- **If the front shares the entity, it is not declared here.** It lives in
  `packages/contracts` and the domain file only re-exports it (§10). A shared
  contract does not make it infrastructure: it is a package with no framework,
  no ORM and no HTTP, so the core can look at it without breaking the inward
  dependency rule.
- **The port name does not name its provider**: `DocumentIngestion`, not
  `RagflowClient`. The provider is named in the adapter.

Commands: `npm run dev | lint | check-types | test | build | db:deploy`.
Swagger is at `/docs`; the endpoints, under the `/api` prefix.

## 10. Shared contracts (`packages/contracts`)

What crosses the HTTP border is declared **exactly once**, with
[TypeBox](https://github.com/sinclairzx81/typebox), and both apps consume it. If
a field changes here, both stop compiling until they catch up.

```
packages/contracts/src/
├── formats.ts                    # JSON Schema format registry
└── <context>/
    ├── <entity>.ts              # schema + type derived with Static<>
    └── <entity>-status.ts       # `as const` object + its schema
```

Every contract exports the two faces of the same object: the **schema**
(`regulatoryDocumentSchema`, JSON Schema at runtime) and the **type**
(`RegulatoryDocument`, derived with `Static<typeof …>`, never written by hand).

### Rules

- **A contract only imports what the `package.json` declares as
  `dependencies`** — today, TypeBox. No Nest, no Prisma, no React and no
  utilities from one of the apps: whatever gets in here, both apps eat. It is
  verified by `import-x/no-extraneous-dependencies`.
- **Dates travel as ISO 8601 strings, not as `Date`.** What crosses the wire is
  JSON; typing `createdAt: Date` would make the front believe it has a `Date`
  when it receives a string. The conversion happens in a single place: the
  back's Prisma mapper.
- **No barrel** (same as §1): the concrete file is imported by its subpath,
  `@ai-form-creator/contracts/<context>/<entity>`.
- **Each app exposes it through its own door**, and the rest of the code imports
  that door, not the package:
  `apps/back/src/<context>/domain/<entity>.ts` and
  `apps/front/src/features/<x>/types/<entity>.ts` only re-export.
- **Module-level `Type.*()` calls carry `/* @__PURE__ */`.** Without the
  annotation the bundler sees a function call, assumes it has side effects and
  pulls all of TypeBox into the front bundle even when only the statuses object
  was imported.

  **And the annotation alone is not always enough.** `/* @__PURE__ */ f(x)` says
  that `f` has no side effects, not that `x` has none. With
  `Type.Enum(object, {…})` that is enough, because the arguments are data; but a
  `Type.Object({ a: Type.String() })` has calls **inside**, and the bundler
  drops the outer one and keeps the inner ones — with the TypeBox import in
  place. That is why every schema with nested calls is wrapped in an annotated
  IIFE, which turns those arguments into a function body:

  ```ts
  export const somethingSchema = /* @__PURE__ */ (() =>
    Type.Object({ name: Type.String({ minLength: 1 }) }))();
  ```

  How to verify it: `npm run build` in `apps/front` and
  `grep -l TypeBox dist/assets/*.js`. It has to find nothing. It is the only way
  of noticing — the build says nothing, it just weighs more.
- **A `format` has to be registered in `formats.ts`.** TypeBox ships none out of
  the box and an unknown format is not ignored: `Value.Check` returns `false`
  with `Unknown format 'uuid'`. The schemas import `formats.uuid` instead of the
  literal precisely so the registration travels as a real module dependency.

### Consumption

It is distributed compiled (`dist/`, ignored by git) in CJS and ESM at the same
time: the back is CommonJS and the front is ESM. The apps declare it with
`"@ai-form-creator/contracts": "file:../../packages/contracts"`, and npm links
it through a symlink — an `npm run build` in the package is visible from the
apps right away.

**In a fresh clone it has to be compiled before touching the apps.** From
`apps/back` there is a shortcut: `npm run contracts:build`. There is
deliberately no `prepare` script: npm would run it during the `npm install` of
the app linking the package, when the devDependencies here do not exist yet, and
the install would fail with a fairly opaque `tsc: not found`.

⚠️ The Docker images of both apps are built **from the repo root**
(`docker build -f apps/<x>/Dockerfile .`), not from the app folder: the `file:`
dependency falls outside a narrower context. And the package's `node_modules`
travels into the image, because npm resolves the symlink to its real path and
the imports coming out of `packages/contracts/dist/**` are looked up from there,
not from the app's `node_modules`.

### Validating at runtime: `@ai-form-creator/contracts/validation`

If an app needs `Value.Check`, **import the `Value` from that subpath**, not
from `@sinclair/typebox/value`. `FormatRegistry` is a singleton per module copy,
and in this monorepo there is more than one (the package declares TypeBox as its
own dependency; the apps linking it through `file:` end up with another hoisted
one). With the wrong copy, `Value.Check` returns `false` with
`Unknown format 'uuid'` over perfectly valid documents, without throwing any
error. That subpath exports the `Value` of the same copy that ran
`FormatRegistry.Set`.

### Adding a contract

1. Create `src/<context>/<entity>.ts` with the schema and its `Static<>`.
2. `npm run lint && npm run check-types && npm run build`.
3. Re-export it from the door of every app using it. The `exports` wildcard
   already covers the subpath: there is no need to touch the `package.json`.

### Contracts that are not HTTP

`form-generation/` also declares what crosses the **other two wires** of the
system, and for the same reason: they are borders between processes that break
quietly.

- `form-generation-workflow.ts` — the Temporal queue, the workflow name, the
  signals and the start argument. If the back enqueues on `'form-generation'`
  and the worker listens on `'form-generations'`, nothing fails, nothing gets
  logged, and the workflow stays queued forever.
- `form-generation-event.ts` — the namespace, the path and the WebSocket event
  names, plus the Postgres `LISTEN`/`NOTIFY` channel. An event name that does
  not match between the `emit` and the `on` leaves the front waiting.

## 11. Temporal worker (`apps/worker`)

The only process talking to the model and the only one moving the status of a
generation. It listens on no port: it takes work from the `form-generation`
queue and writes to `app-postgres`. The full guide is in
[`apps/worker/README.md`](./apps/worker/README.md).

```
src/
├── config/       # env + adapter settings. Only worker.ts and activities/ read it
├── domain/       # pure: prompt, validation, Formily compiler. ZERO IO
│   └── ports/    # what the workflow needs from the world, declared as a type
├── activities/   # the only place with network and database
├── workflows/    # deterministic; it only orchestrates
└── worker.ts     # composition root
```

| From ↓ / To →    | `domain` | `activities` | `config` | `pg`, `node:*`, `@temporalio/worker` |
| ---------------- | :------: | :----------: | :------: | :---------------------------------: |
| `domain`         |    ✅    |      ❌      |    ❌    |                 ❌                  |
| `workflows`      |    ✅    |      ❌      |    ❌    |                 ❌                  |
| `activities`     |    ✅    |      ✅      |    ✅    |                 ✅                  |

**These rules are not aesthetic: Temporal imposes them.** Workflow code runs in
a deterministic sandbox and is re-executed from scratch every time the worker
restarts. There is no network, no disk, no `process.env`, and anything returning
a different result on the second run breaks the execution — not at compile time,
but in production, on a re-execution, with a `Nondeterminism error`.

When adding code, respect this:

- **The workflow does not import activities.** It talks to them through the
  `domain/ports/` port that `proxyActivities` resolves. It is the same
  dependency inversion as the back.
- **What gets re-executed cannot change its mind.** If a pure function decides a
  workflow path and its result could change with a deployment, it goes wrapped
  in an activity: an activity result is recorded in the history and re-read, not
  recomputed. That is the case of `validateFormDraft` — the workflow waits up to
  30 days for a human review, and in 30 days new code gets deployed.
- **The retry for an invalid schema lives in the workflow, not in Temporal's
  retry policy.** The latter re-executes the same activity with the same
  arguments; the repair loop needs to rewrite the prompt with the errors inside.
- **The worker does not read the database.** Everything it needs is handed to it
  by the back in the workflow argument. Its only statements are status writes,
  and they all live in `activities/form-generation-store.ts`.
- **The database schema does not belong here.** It is governed by
  `apps/back/prisma/schema.prisma` and the migrations are run by the back.

⚠️ **The worker image is not Alpine.** The Temporal SDK carries its core in Rust
as a native binary and only publishes prebuilds for glibc. On musl the image
builds end to end and blows up at startup. Use `node:24-bookworm-slim`.

### The complete path of a generation

```
front (prompt + documents)
  └► POST /api/form-generations
       └► back: validates documents, writes a PENDING row, enqueues the workflow
            └► worker: RETRIEVING → GENERATING → VALIDATING → (REPAIRING ×3)
                        └► AWAITING_REVIEW   ← it halts, always
                             └► `review` signal (sent by the back)
                                  └► APPROVED / REJECTED

every status change ─► UPDATE ─► trigger ─► pg_notify ─► back (LISTEN)
                                                      └─► WebSocket ─► front
```

**The AI never publishes on its own.** Every generation halts at
`AWAITING_REVIEW` until a person decides, and the only transition towards
`APPROVED` starts there. Three things hold it up: the workflow's `condition`,
the 409 of the `ReviewFormGeneration` use case, and the back's repository port
**not having an `update`** — the back does not write statuses, only the worker
does.

The `pg_notify` carries only the id and the status, not the row: the payload has
a hard cap of 8 KB and the Formily schema goes over it with any medium-sized
form. The back re-reads by id and publishes the already mapped entity.
