import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * La arquitectura del worker no es un gusto nuestro: se la impone Temporal.
 *
 *   config → worker.ts
 *   activities → domain
 *   workflows → domain          (NUNCA → activities, NUNCA → config)
 *   domain → nada
 *
 * El código de un workflow no corre como código normal: corre en un sandbox
 * determinista, reejecutado de cero cada vez que el worker se reinicia o se
 * reemplaza. Ahí adentro no hay red, no hay disco, no hay `process.env`, y
 * cualquier cosa que dé un resultado distinto en la segunda corrida rompe la
 * ejecución. Un `import` equivocado no falla al compilar: falla en producción,
 * en una reejecución, con un `Nondeterminism error` a los tres días.
 *
 * Por eso las capas de acá se parecen tanto a las del back (`CLAUDE.md` §9): el
 * `domain/` es puro por la misma razón que allá, `activities/` es la
 * infraestructura —el único lugar con IO— y `workflows/` sólo orquesta. Que el
 * workflow no pueda importar `activities/` es lo que fuerza a que hable con
 * ellas por un puerto (`domain/ports/form-generation-activities.port.ts`), que
 * es exactamente lo que Temporal quiere: el workflow declara qué necesita, y el
 * `proxyActivities` lo resuelve por RPC.
 */
const workerZones = [
  {
    target: './src/domain',
    from: ['./src/activities', './src/workflows', './src/config'],
    message:
      'El dominio es puro: sin IO, sin Temporal y sin variables de entorno. ' +
      'Si necesitás algo de afuera, declaralo como puerto en `domain/ports/`.',
  },
  {
    target: './src/workflows',
    from: ['./src/activities', './src/config'],
    message:
      'Un workflow no puede tocar una actividad ni la configuración: corre en ' +
      'un sandbox determinista, sin red ni `process.env`. Hablá con las ' +
      'actividades por el puerto de `domain/ports/` y `proxyActivities`.',
  },
  {
    target: './src/activities',
    from: './src/workflows',
    message:
      'Las actividades no conocen al workflow que las usa. La dependencia va ' +
      'workflow → puerto ← actividad.',
  },
];

/** Todo lo que no puede existir dentro del sandbox de un workflow. */
const sandboxForbiddenPackages = {
  group: [
    'pg',
    'pg/*',
    'dotenv',
    'dotenv/*',
    'node:*',
    'fs',
    'path',
    'crypto',
    '@temporalio/worker',
    '@temporalio/activity',
    '@temporalio/client',
  ],
  message:
    'Prohibido dentro de un workflow: no hay IO ni módulos de Node en el ' +
    'sandbox determinista. Movelo a `activities/`.',
};

/** Lo mismo, más Temporal: el dominio ni siquiera sabe que existe. */
const domainForbiddenPackages = {
  group: [
    'pg',
    'pg/*',
    'dotenv',
    'dotenv/*',
    'node:*',
    'fs',
    'path',
    'crypto',
    '@temporalio/*',
  ],
  message:
    'El dominio no conoce ni el motor de orquestación ni el mundo exterior. ' +
    'Movelo a `activities/` o declaralo como puerto.',
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  prettier,

  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.mjs'] },
        tsconfigRootDir: rootDir,
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: { project: path.join(rootDir, 'tsconfig.json') },
      },
    },
    rules: {
      // --- arquitectura ---
      'import-x/no-restricted-paths': ['error', { zones: workerZones }],
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

      // --- nombrado (CLAUDE.md §2) ---
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
        // Los payloads externos (LiteLLM, RAGFlow) y las columnas de Postgres
        // usan snake_case.
        { selector: 'objectLiteralProperty', format: null },
        { selector: 'typeProperty', format: null },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        { selector: 'classProperty', format: ['camelCase'] },
        { selector: 'classMethod', format: ['camelCase'] },
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
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      // El worker loguea con el logger de Temporal, que sí llega a los logs del
      // pod con contexto de workflow. `console` los deja huérfanos.
      'no-console': 'error',
    },
  },

  {
    files: ['src/workflows/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [sandboxForbiddenPackages] },
      ],
    },
  },

  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [domainForbiddenPackages] },
      ],
    },
  },

  // Los tests pueden ser laxos con los tipos: los dobles mienten a propósito.
  {
    files: ['**/__tests__/**/*.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'no-restricted-imports': 'off',
      'import-x/no-restricted-paths': 'off',
    },
  },

  // El bootstrap y la config son la raíz de composición: leen `process.env` y
  // arman el mundo. Son la excepción, igual que `main.ts` en el back.
  {
    files: ['src/worker.ts', 'src/config/**/*.ts', 'eslint.config.mjs'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },

  {
    files: ['eslint.config.mjs'],
    rules: {
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },
);
