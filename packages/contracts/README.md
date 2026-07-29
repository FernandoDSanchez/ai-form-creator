# @ai-form-creator/contracts

Contratos que cruzan la frontera HTTP, declarados **una sola vez** con
[TypeBox](https://github.com/sinclairzx81/typebox). `apps/back` y `apps/front`
consumen la misma definición: si un campo cambia acá, las dos apps dejan de
compilar hasta que se acomoden.

Cada contrato exporta las dos caras del mismo objeto:

- el **schema** (`regulatoryDocumentSchema`) — JSON Schema en runtime, sirve
  para validar y para documentar;
- el **tipo** (`RegulatoryDocument`) — derivado con `Static<typeof …>`, no se
  escribe a mano.

## Cómo se importa

No hay barrel (`index.ts`): se importa el archivo concreto, igual que en
`apps/front` (`CLAUDE.md` §1). Las rutas de import replican las de `src/`.

```ts
import {
  regulatoryDocumentSchema,
  type RegulatoryDocument,
} from '@ai-form-creator/contracts/regulatory-documents/regulatory-document';

import { regulatoryDocumentStatuses } from '@ai-form-creator/contracts/regulatory-documents/regulatory-document-status';
```

## Fechas

Viajan como **string ISO 8601**, no como `Date`. Lo que cruza el cable es JSON:
tipar `createdAt: Date` haría que el front creyera tener un `Date` cuando lo
que recibe es un string. La conversión ocurre en un solo lugar, el mapper de
Prisma del back (`infrastructure/persistence/regulatory-document.mapper.ts`).

## Consumo

El paquete se distribuye compilado (`dist/`, ignorado por git), en CommonJS y
ESM a la vez: `apps/back` es CJS (NestJS) y `apps/front` es ESM (Vite).

```bash
npm install
npm run build  # cjs + esm + marcador de módulo
npm run check-types
```

`apps/back` lo declara como dependencia local:

```json
"@ai-form-creator/contracts": "file:../../packages/contracts"
```

npm lo enlaza por symlink, así que un `npm run build` acá se ve al toque desde
la app, sin reinstalar nada.

**En un clone nuevo hay que compilarlo antes de tocar las apps** — `dist/` no
va al repo. Desde `apps/back` hay un atajo:

```bash
npm run contracts:build   # install + build de este paquete
```

A propósito **no** hay script `prepare`: npm lo ejecutaría durante el
`npm install` de la app que enlaza el paquete, cuando las devDependencies de
acá todavía no existen, y el install fallaría con un `tsc: not found` bastante
opaco. Compilar es un paso explícito.

## Agregar un contrato

1. Creá `src/<contexto>/<entidad>.ts` con el schema y su `Static<>`.
2. Compilá (`npm run build`).
3. Importalo desde las apps por su subpath — el wildcard de `exports` ya lo
   cubre, no hay que tocar el `package.json`.
