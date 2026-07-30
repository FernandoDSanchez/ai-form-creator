/**
 * TS -> Design Tokens bridge.
 *
 * The tokens are defined exactly ONCE in `src/styles/index.css` (`@theme`).
 * This module only exposes *references* (`var(--token)`) for the cases where a
 * Tailwind class cannot be used: inline styles, canvas, chart libraries,
 * `<meta name="theme-color">`, and so on.
 *
 * Forbidden: duplicating the literal token value here (`#4f46e5`).
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
