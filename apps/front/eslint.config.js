import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import checkFile from 'eslint-plugin-check-file';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-plugin-prettier/recommended';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const featuresDir = path.join(rootDir, 'src', 'features');

/**
 * Las features se descubren en disco: al crear `src/features/mi-feature` la
 * restricción de imports cruzados se aplica sola, sin editar este archivo.
 */
const featureNames = fs.existsSync(featuresDir)
  ? fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];

/** Regla 1: una feature no puede importar de otra feature. */
const crossFeatureZones = featureNames.map((feature) => ({
  target: `./src/features/${feature}`,
  from: './src/features',
  except: [`./${feature}`],
  message:
    'No se permiten imports entre features. Compón las features en la capa `app/`.',
}));

/** Regla 2: el código fluye en una sola dirección: shared -> features -> app. */
const unidirectionalZones = [
  {
    target: './src/features',
    from: './src/app',
    message:
      'Una feature no puede importar de `app/`. La dependencia va de app -> features.',
  },
  {
    target: [
      './src/components',
      './src/hooks',
      './src/lib',
      './src/types',
      './src/utils',
      './src/config',
    ],
    from: ['./src/features', './src/app'],
    message:
      'El código compartido no puede importar de `features/` ni de `app/`.',
  },
];

/**
 * Imports prohibidos por patrón. Complementan a `no-restricted-paths`:
 * funcionan sobre el string del import, sin depender del resolver.
 */
const noAppImports = {
  group: ['@/app', '@/app/*', '@/app/**'],
  message: 'Sólo `src/app` puede importar de `src/app`.',
};

const noFeatureImports = {
  group: ['@/features/*', '@/features/**'],
  message:
    'El código compartido no puede importar de `features/`. Inyecta lo que necesites por props.',
};

const otherFeatureImports = (feature) => ({
  group: [
    '@/features/*',
    '@/features/**',
    `!@/features/${feature}`,
    `!@/features/${feature}/**`,
  ],
  message:
    'No se permiten imports entre features. Compón las features en `src/app/routes`.',
});

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'public/mockServiceWorker.js',
      'generators/**',
      'ragflow/**',
      '*.config.js',
    ],
  },

  // ---------------------------------------------------------------------------
  // Base
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat['recommended-latest'],
      jsxA11y.flatConfigs.recommended,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
      'import-x/resolver': {
        typescript: {
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
          noWarnOnMultipleProjects: true,
        },
      },
    },
    plugins: {
      'check-file': checkFile,
    },
    rules: {
      // --- Arquitectura -------------------------------------------------------
      'import-x/no-restricted-paths': [
        'error',
        { zones: [...crossFeatureZones, ...unidirectionalZones] },
      ],
      'no-restricted-imports': ['error', { patterns: [noAppImports] }],
      'import-x/no-cycle': ['error', { maxDepth: 4 }],
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
            'object',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
      'import-x/default': 'off',

      // --- Nombrado de archivos y carpetas -----------------------------------
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/!(__tests__)': 'KEBAB_CASE' },
      ],

      // --- Nombrado de símbolos ----------------------------------------------
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
          leadingUnderscore: 'allow',
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        // Los renombrados de destructuring (`{ default: Component }`) y los
        // datos que vienen de APIs externas no siguen nuestras reglas.
        {
          selector: ['variable', 'parameter'],
          modifiers: ['destructured'],
          format: null,
        },
        { selector: 'typeParameter', format: ['PascalCase'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        {
          selector: 'objectLiteralProperty',
          format: null,
        },
        {
          selector: 'typeProperty',
          format: null,
        },
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],

      // --- Magic strings / magic numbers -------------------------------------
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator=/^[=!]==?$/]:not([left.type='UnaryExpression']) > Literal[value=/^[A-Za-z]/]",
          message:
            'Magic string: compara contra una constante nombrada (config/constants) en vez de un literal.',
        },
        {
          selector: "JSXAttribute[name.name='to'] > Literal",
          message:
            'Magic string: usa `paths.*.getHref()` de `@/config/paths` en vez de una ruta literal.',
        },
        {
          selector:
            "CallExpression[callee.object.name='localStorage'] > Literal:first-child, CallExpression[callee.object.name='sessionStorage'] > Literal:first-child",
          message:
            'Magic string: define la clave de storage en `@/config/storage-keys`.',
        },
      ],
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1, 2],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreTypeIndexes: true,
          ignoreReadonlyClassProperties: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],

      // --- Calidad general ----------------------------------------------------
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/prop-types': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      'linebreak-style': ['error', 'unix'],
      'prettier/prettier': ['error', {}, { usePrettierrc: true }],
    },
  },

  // ---------------------------------------------------------------------------
  // Sólo `src/config` (y el bootstrap) leen variables de entorno crudas.
  // ---------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/config/**', 'src/testing/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.type='MetaProperty'][property.name='env']",
          message:
            'No leas `import.meta.env` directamente: expórtalo tipado desde `@/config/env`.',
        },
        {
          selector:
            "BinaryExpression[operator=/^[=!]==?$/]:not([left.type='UnaryExpression']) > Literal[value=/^[A-Za-z]/]",
          message:
            'Magic string: compara contra una constante nombrada (config/constants) en vez de un literal.',
        },
        {
          selector: "JSXAttribute[name.name='to'] > Literal",
          message:
            'Magic string: usa `paths.*.getHref()` de `@/config/paths` en vez de una ruta literal.',
        },
        {
          selector:
            "CallExpression[callee.object.name='localStorage'] > Literal:first-child, CallExpression[callee.object.name='sessionStorage'] > Literal:first-child",
          message:
            'Magic string: define la clave de storage en `@/config/storage-keys`.',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'process',
          message: 'Usa `@/config/env` en vez de `process.env`.',
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Capa compartida: no conoce ni features ni app.
  // ---------------------------------------------------------------------------
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
      'src/types/**/*.{ts,tsx}',
      'src/utils/**/*.{ts,tsx}',
      'src/config/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [noAppImports, noFeatureImports] },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Por feature: cada feature sólo puede importarse a sí misma.
  // `src/app` sí puede importar cualquier feature (regla base).
  // ---------------------------------------------------------------------------
  ...featureNames.map((feature) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [noAppImports, otherFeatureImports(feature)] },
      ],
    },
  })),

  // ---------------------------------------------------------------------------
  // Excepciones a las reglas de arquitectura:
  // - `src/main.tsx` es el composition root: monta `src/app`.
  // - `src/testing` es infraestructura de pruebas/mocks: conoce a todos.
  // ---------------------------------------------------------------------------
  {
    files: ['src/main.tsx', 'src/testing/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      'import-x/no-restricted-paths': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // Configuración centralizada: los literales viven aquí, así que se relajan
  // las reglas de magic values.
  // ---------------------------------------------------------------------------
  {
    files: [
      'src/config/**/*.ts',
      'src/**/config/**/*.ts',
      'src/testing/**/*.{ts,tsx}',
      'vite.config.ts',
    ],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // Tests
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    extends: [testingLibrary.configs['flat/react']],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      '@typescript-eslint/no-magic-numbers': 'off',
      'no-restricted-syntax': 'off',
    },
    languageOptions: {
      globals: vitest.environments.env.globals,
    },
  },
);
