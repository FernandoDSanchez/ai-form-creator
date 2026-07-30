import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The package does not declare `"type"`, so Node reads the whole tree as
 * CommonJS. The `build:esm` output is real ESM, and without this marker Node
 * would misread it (`Cannot use import statement outside a module`).
 *
 * This is the standard way to publish dual CJS/ESM with bare `tsc`: one folder
 * per format, each with its own one-line `package.json`.
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
