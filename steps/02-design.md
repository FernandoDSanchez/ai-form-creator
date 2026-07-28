# 02 — Diseño ✅

- [x] Design tokens en `@theme` (`src/styles/index.css`): color de marca,
      colores semánticos (surface/content/border/estados), spacing, radios,
      sombras, tipografía, duraciones
- [x] Tokens de contenedor con nombre propio (`--container-page/prose/toast`)
      para evitar la colisión `--spacing-*` vs `max-w-*`
- [x] Puente TS → tokens: `src/config/design-tokens.ts` (referencias `var(--x)`)
- [x] Variant mapping con CVA: `Button`, `Spinner`, `controlVariants`
- [x] Variant mapping de datos: `notificationStyles`, `formStatusVariants`
- [x] Layouts: `AppLayout`, `ContentLayout`; error boundary y toasts

Pendiente (ver HUMAN-TASK): modo oscuro, webfont Inter, branding.
