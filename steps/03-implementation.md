# 03 — Implementación ✅

- [x] Capa `app/`: provider (QueryClient + ErrorBoundary + Suspense + toasts),
      router con rutas lazy, rutas `/`, `/forms`, `/forms/:formTemplateId`, 404
- [x] Capa compartida: `api-client` (axios + interceptores), `react-query`
      config y tipos, `cn`, UI (`Button`, `Spinner`, `Link`, `Notifications`)
- [x] Configuración centralizada: `env` (zod), `paths`, `app-config`,
      `storage-keys`, `ui-variants`, `server-config`
- [x] Feature `dynamic-form`:
  - [x] `api/`: lista, detalle y envío de respuestas
  - [x] `components/fields/`: text, textarea, number, select, radio, checkbox, date
  - [x] `form-item` (decorador), `schema-field` (mapping), `dynamic-form` (renderer)
  - [x] `form-templates-list`, `form-template-detail`, `form-status-badge`
  - [x] `config/`: endpoints + query keys, nombres de componentes, estados,
        locale de validación en español
- [x] Mocks MSW con 3 plantillas de ejemplo (publicada, publicada, borrador)
