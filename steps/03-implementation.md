# 03 — Implementation ✅

- [x] `app/` layer: provider (QueryClient + ErrorBoundary + Suspense + toasts),
      router with lazy routes, routes `/`, `/forms`, `/forms/:formTemplateId`, 404
- [x] Shared layer: `api-client` (axios + interceptors), `react-query` config
      and types, `cn`, UI (`Button`, `Spinner`, `Link`, `Notifications`)
- [x] Centralized configuration: `env` (zod), `paths`, `app-config`,
      `storage-keys`, `ui-variants`, `server-config`
- [x] `dynamic-form` feature:
  - [x] `api/`: list, detail and response submission
  - [x] `components/fields/`: text, textarea, number, select, radio, checkbox, date
  - [x] `form-item` (decorator), `schema-field` (mapping), `dynamic-form` (renderer)
  - [x] `form-templates-list`, `form-template-detail`, `form-status-badge`
  - [x] `config/`: endpoints + query keys, component names, statuses,
        validation locale
- [x] MSW mocks with 3 sample templates (published, published, draft)
