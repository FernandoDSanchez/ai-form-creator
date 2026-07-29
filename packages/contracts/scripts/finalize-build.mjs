import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * El paquete no declara `"type"`, así que Node lee todo el árbol como
 * CommonJS. La salida de `build:esm` es ESM de verdad, y sin este marcador
 * Node la interpretaría mal (`Cannot use import statement outside a module`).
 *
 * Es la forma estándar de publicar dual CJS/ESM con `tsc` pelado: una carpeta
 * por formato, cada una con su propio `package.json` de una línea.
 */
const esmDir = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  'dist',
  'esm',
);

await mkdir(esmDir, { recursive: true });
await writeFile(
  path.join(esmDir, 'package.json'),
  `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
);
