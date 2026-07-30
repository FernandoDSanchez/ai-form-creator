/**
 * Variant Mapping — dictionaries of variants shared across the whole app.
 *
 * Instead of comparing against loose strings (`if (type === 'error')`) or
 * chaining `if/else` per state, a `state -> configuration` map is defined. The
 * `as const` + `typeof` derive the types, so adding a variant to the map makes
 * it valid in TypeScript without touching any type by hand.
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
