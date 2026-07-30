# @ai-form-creator/contracts

Contracts that cross the HTTP border, declared **exactly once** with
[TypeBox](https://github.com/sinclairzx81/typebox). `apps/back` and `apps/front`
consume the same definition: if a field changes here, both apps stop compiling
until they catch up.

Every contract exports the two faces of the same object:

- the **schema** (`regulatoryDocumentSchema`) — JSON Schema at runtime, used to
  validate and to document;
- the **type** (`RegulatoryDocument`) — derived with `Static<typeof …>`, never
  written by hand.

## How it is imported

There is no barrel (`index.ts`): the concrete file is imported, just like in
`apps/front` (`CLAUDE.md` §1). Import paths mirror those of `src/`.

```ts
import {
  regulatoryDocumentSchema,
  type RegulatoryDocument,
} from '@ai-form-creator/contracts/regulatory-documents/regulatory-document';

import { regulatoryDocumentStatuses } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';
```

## Dates

They travel as **ISO 8601 strings**, not as `Date`. What crosses the wire is
JSON: typing `createdAt: Date` would make the front believe it has a `Date` when
what it receives is a string. The conversion happens in a single place, the
back's Prisma mapper
(`infrastructure/persistence/regulatory-document.mapper.ts`).

## Consumption

The package is distributed compiled (`dist/`, ignored by git), in CommonJS and
ESM at the same time: `apps/back` is CJS (NestJS) and `apps/front` is ESM
(Vite).

```bash
npm install
npm run build  # cjs + esm + module marker
npm run check-types
```

`apps/back` declares it as a local dependency:

```json
"@ai-form-creator/contracts": "file:../../packages/contracts"
```

npm links it through a symlink, so an `npm run build` here is visible from the
app right away, without reinstalling anything.

**In a fresh clone it has to be compiled before touching the apps** — `dist/`
does not go into the repo. From `apps/back` there is a shortcut:

```bash
npm run contracts:build   # install + build of this package
```

There is deliberately **no** `prepare` script: npm would run it during the
`npm install` of the app linking the package, when the devDependencies here do
not exist yet, and the install would fail with a fairly opaque `tsc: not found`.
Compiling is an explicit step.

## Adding a contract

1. Create `src/<context>/<entity>.ts` with the schema and its `Static<>`.
2. Compile (`npm run build`).
3. Import it from the apps by its subpath — the `exports` wildcard already
   covers it, no need to touch the `package.json`.
