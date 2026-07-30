# 01 — Scaffolding ✅

- [x] Vite 8 + React 19 + TypeScript 6 (`react-ts` template, adapted)
- [x] Alias `@/` → `src/` (vite + tsconfig)
- [x] Tailwind v4 through `@tailwindcss/vite`
- [x] Prettier + `prettier-plugin-tailwindcss`
- [x] ESLint 9 flat config with the architecture rules
- [x] husky: `pre-commit` (lint-staged) and `pre-push` (types + tests)
- [x] Vitest + Testing Library + jsdom, limited to `src/**`
- [x] MSW (`public/mockServiceWorker.js`, handlers in `src/testing/mocks`)
- [x] Plop (`npm run generate`) with `feature` and `component` generators
- [x] `git init` + `.gitignore` (excludes `ragflow/` and `.env`)
