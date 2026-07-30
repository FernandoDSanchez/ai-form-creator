# 02 — Design ✅

- [x] Design tokens in `@theme` (`src/styles/index.css`): brand colour,
      semantic colours (surface/content/border/states), spacing, radii,
      shadows, typography, durations
- [x] Container tokens with names of their own (`--container-page/prose/toast`)
      to avoid the `--spacing-*` vs `max-w-*` collision
- [x] TS → tokens bridge: `src/config/design-tokens.ts` (`var(--x)` references)
- [x] Variant mapping with CVA: `Button`, `Spinner`, `controlVariants`
- [x] Data variant mapping: `notificationStyles`, `formStatusVariants`
- [x] Layouts: `AppLayout`, `ContentLayout`; error boundary and toasts

Pending (see HUMAN-TASK): dark mode, Inter webfont, branding.
