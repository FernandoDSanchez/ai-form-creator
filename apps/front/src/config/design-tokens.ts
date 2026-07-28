/**
 * Puente TS -> Design Tokens.
 *
 * Los tokens se definen UNA sola vez en `src/styles/index.css` (`@theme`).
 * Este módulo sólo expone *referencias* (`var(--token)`) para los casos donde
 * no se puede usar una clase de Tailwind: estilos inline, canvas, librerías de
 * charts, `<meta name="theme-color">`, etc.
 *
 * Prohibido: duplicar aquí el valor literal del token (`#4f46e5`).
 */
const cssVar = (token: string) => `var(--${token})`;

export const colorTokens = {
  brand: cssVar('color-brand-500'),
  brandStrong: cssVar('color-brand-600'),
  surface: cssVar('color-surface'),
  surfaceMuted: cssVar('color-surface-muted'),
  border: cssVar('color-border'),
  content: cssVar('color-content'),
  contentMuted: cssVar('color-content-muted'),
  success: cssVar('color-success'),
  warning: cssVar('color-warning'),
  danger: cssVar('color-danger'),
  info: cssVar('color-info'),
} as const;

export const spacingTokens = {
  xs: cssVar('spacing-xs'),
  sm: cssVar('spacing-sm'),
  md: cssVar('spacing-md'),
  lg: cssVar('spacing-lg'),
  xl: cssVar('spacing-xl'),
} as const;

export const radiusTokens = {
  sm: cssVar('radius-sm'),
  md: cssVar('radius-md'),
  lg: cssVar('radius-lg'),
  pill: cssVar('radius-pill'),
} as const;

export const durationTokens = {
  fast: cssVar('animate-duration-fast'),
  base: cssVar('animate-duration-base'),
} as const;

export type ColorToken = keyof typeof colorTokens;
