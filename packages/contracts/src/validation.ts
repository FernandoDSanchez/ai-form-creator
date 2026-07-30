import { Value } from '@sinclair/typebox/value';

import { formats } from './formats.js';

/**
 * The package validator. **Do not import `@sinclair/typebox/value` on your
 * own**: import it from here.
 *
 * The reason is that `FormatRegistry` is a singleton *per module copy*, and
 * this monorepo has more than one. `packages/contracts` declares TypeBox as
 * its own dependency, so npm gives it its own `node_modules`; the apps that
 * link the package through `file:` end up with another hoisted copy in theirs.
 * Node resolves each `require` from the file asking for it, which means:
 *
 *   - `contracts/dist/**` registers the formats in the `contracts` copy,
 *   - an app calling `Value.Check` with its own copy looks at an empty
 *     registry and fails with `Unknown format 'uuid'` — returning `false` for
 *     perfectly valid documents, without throwing any error.
 *
 * That failure is silent and baffling (the schema "looks fine", the data
 * "looks fine"). By exporting the `Value` from the same copy that ran
 * `FormatRegistry.Set`, the problem cannot happen.
 *
 * This subpath is meant for Node consumers (the back and the worker). The
 * front does not validate at runtime: it receives types, not schemas.
 */
export { Value };

/**
 * Re-exported so the `formats.js` import is not side-effect only: the
 * `package.json` declares `"sideEffects": false`, and a bundler is within its
 * rights to delete an import nobody uses — taking the format registration with
 * it.
 */
export { formats };
