# 01 — Scaffolding ✅

- [x] Vite 8 + React 19 + TypeScript 6 (plantilla `react-ts`, adaptada)
- [x] Alias `@/` → `src/` (vite + tsconfig)
- [x] Tailwind v4 vía `@tailwindcss/vite`
- [x] Prettier + `prettier-plugin-tailwindcss`
- [x] ESLint 9 flat config con las reglas de arquitectura
- [x] husky: `pre-commit` (lint-staged) y `pre-push` (types + tests)
- [x] Vitest + Testing Library + jsdom, limitado a `src/**`
- [x] MSW (`public/mockServiceWorker.js`, handlers en `src/testing/mocks`)
- [x] Plop (`npm run generate`) con generadores `feature` y `component`
- [x] `git init` + `.gitignore` (excluye `ragflow/` y `.env`)
