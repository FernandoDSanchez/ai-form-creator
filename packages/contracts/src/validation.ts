import { Value } from '@sinclair/typebox/value';

import { formats } from './formats.js';

/**
 * El validador del paquete. **No importes `@sinclair/typebox/value` por tu
 * cuenta**: importalo de acá.
 *
 * El motivo es que `FormatRegistry` es un singleton *por copia del módulo*, y
 * en este monorepo hay más de una. `packages/contracts` declara TypeBox como
 * dependencia propia, así que npm le deja su `node_modules`; las apps que
 * enlazan el paquete por `file:` terminan con otra copia hoisteada en la suya.
 * Node resuelve cada `require` desde el archivo que lo pide, o sea que:
 *
 *   - `contracts/dist/**` registra los formatos en la copia de `contracts`,
 *   - una app que haga `Value.Check` con su propia copia mira un registro vacío
 *     y falla con `Unknown format 'uuid'` — devolviendo `false` para
 *     documentos perfectamente válidos, sin tirar ningún error.
 *
 * Ese fallo es silencioso y desconcertante (el schema «se ve bien», el dato «se
 * ve bien»). Exportando el `Value` de la misma copia que corrió
 * `FormatRegistry.Set`, el problema no se puede dar.
 *
 * Subpath pensado para consumidores de Node (el back y el worker). El front no
 * valida en runtime: recibe tipos, no schemas.
 */
export { Value };

/**
 * Reexportado para que el import de `formats.js` no sea sólo de efecto
 * colateral: el `package.json` declara `"sideEffects": false`, y un bundler
 * está en su derecho de borrar un import que nadie usa — llevándose el registro
 * de formatos con él.
 */
export { formats };
