import { FormatRegistry } from '@sinclair/typebox';

/**
 * TypeBox ships with no formats registered out of the box, and an unknown
 * `format` is **not** ignored: `Value.Check` returns `false` with
 * `"Unknown format 'uuid'"`. Which means declaring `format: 'uuid'` without
 * registering it makes the schema reject even valid documents.
 *
 * That is why formats are registered here, next to their names. Schemas import
 * `formats.uuid` instead of the literal `'uuid'`, so the registration travels
 * as a real module dependency: there is no way to use the format without
 * having registered it, nor for a bundler to drop the import as dead code.
 */

/** UUID of any version, lower or upper case. */
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** RFC 3339 date-time with an explicit offset (`Z` or `±hh:mm`). */
const dateTimePattern =
  /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

export const formats = {
  uuid: 'uuid',
  dateTime: 'date-time',
} as const;

FormatRegistry.Set(formats.uuid, (value) => uuidPattern.test(value));

FormatRegistry.Set(
  formats.dateTime,
  // The shape is checked by the pattern; that the date actually exists (no
  // month 13, no February 31st) is checked by `Date.parse`.
  (value) => dateTimePattern.test(value) && !Number.isNaN(Date.parse(value)),
);
