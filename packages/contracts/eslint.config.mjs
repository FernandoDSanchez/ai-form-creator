import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  js.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  prettier,

  // ---------------------------------------------------------------------------
  // Los contratos. Es el único código que compilan las dos apps, así que se
  // mira con la misma lupa que el núcleo del back.
  // ---------------------------------------------------------------------------
  {
    files: ['src/**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: rootDir,
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: { project: path.join(rootDir, 'tsconfig.json') },
      },
    },
    rules: {
      /**
       * La regla arquitectónica del paquete, y la única que necesita:
       * un contrato sólo puede importar lo que este `package.json` declara
       * como `dependencies` —hoy, TypeBox—. Nada de Nest, Prisma, React ni
       * utilidades de una de las apps: lo que entre acá se lo comen las dos.
       *
       * Las devDependencies quedan fuera a propósito: `typescript` o `eslint`
       * son herramientas del build, no cosas que un contrato pueda importar.
       */
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: false,
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],

      'import-x/no-cycle': ['error', { maxDepth: Infinity }],
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // --- nombrado (mismas convenciones que las apps, CLAUDE.md §2) ---
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        // Las claves de un schema describen el JSON que viaja por el cable
        // (`$id`, `date-time`), no símbolos de TypeScript.
        { selector: 'objectLiteralProperty', format: null },
        { selector: 'typeProperty', format: null },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
      ],

      // --- calidad ---
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },

  // ---------------------------------------------------------------------------
  // Herramientas del build: Node puro, fuera del tsconfig.
  // ---------------------------------------------------------------------------
  {
    files: ['scripts/**/*.mjs', 'eslint.config.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Los plugins de ESLint exportan default + named con el mismo nombre;
      // la advertencia es un falso positivo del propio archivo de config.
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },
);
