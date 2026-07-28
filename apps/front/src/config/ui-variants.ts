/**
 * Variant Mapping — diccionarios de variantes compartidas por toda la app.
 *
 * En vez de comparar contra strings sueltos (`if (type === 'error')`) o de
 * encadenar `if/else` por estado, se define un mapa `estado -> configuración`.
 * Los `as const` + `typeof` derivan los tipos, así que añadir una variante al
 * mapa la hace válida en TypeScript sin tocar ningún tipo a mano.
 */
export const notificationVariants = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
} as const;

export type NotificationVariant =
  (typeof notificationVariants)[keyof typeof notificationVariants];

export const asyncStatus = {
  idle: 'idle',
  pending: 'pending',
  success: 'success',
  error: 'error',
} as const;

export type AsyncStatus = (typeof asyncStatus)[keyof typeof asyncStatus];
