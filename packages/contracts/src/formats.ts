import { FormatRegistry } from '@sinclair/typebox';

/**
 * TypeBox no trae ningún formato registrado de fábrica, y un `format`
 * desconocido **no** se ignora: `Value.Check` devuelve `false` con
 * `"Unknown format 'uuid'"`. O sea que declarar `format: 'uuid'` sin
 * registrarlo hace que el schema rechace hasta los documentos válidos.
 *
 * Por eso los formatos se registran acá, junto a sus nombres. Los schemas
 * importan `formats.uuid` en vez del literal `'uuid'`, así el registro viaja
 * como dependencia real del módulo: no hay forma de usar el formato sin
 * haberlo registrado, ni de que un bundler se coma el import por creerlo
 * muerto.
 */

/** UUID de cualquier versión, en minúsculas o mayúsculas. */
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fecha-hora RFC 3339 con offset explícito (`Z` o `±hh:mm`). */
const dateTimePattern =
  /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

export const formats = {
  uuid: 'uuid',
  dateTime: 'date-time',
} as const;

FormatRegistry.Set(formats.uuid, (value) => uuidPattern.test(value));

FormatRegistry.Set(
  formats.dateTime,
  // La forma la valida el patrón; que la fecha exista de verdad (nada de
  // meses 13 ni 31 de febrero) lo valida `Date.parse`.
  (value) => dateTimePattern.test(value) && !Number.isNaN(Date.parse(value)),
);
