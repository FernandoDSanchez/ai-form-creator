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
 * Features are discovered on disk: creating `src/features/my-feature` applies
 * the cross-import restriction on its own, without editing this file.
 */
const featureNames = fs.existsSync(featuresDir)
  ? fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];

/** Rule 1: a feature cannot import from another feature. */
const crossFeatureZones = featureNames.map((feature) => ({
  target: `./src/features/${feature}`,
  from: './src/features',
  except: [`./${feature}`],
  message:
    'Imports between features are not allowed. Compose features in the `app/` layer.',
}));

/** Rule 2: code flows in one direction only: shared -> features -> app. */
const unidirectionalZones = [
  {
    target: './src/features',
    from: './src/app',
    message:
      'A feature cannot import from `app/`. The dependency goes app -> features.',
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
    message: 'Shared code cannot import from `features/` or from `app/`.',
  },
];

/**
 * Imports forbidden by pattern. They complement `no-restricted-paths`: they
 * work on the import string, without relying on the resolver.
 */
const noAppImports = {
  group: ['@/app', '@/app/*', '@/app/**'],
  message: 'Only `src/app` can import from `src/app`.',
};

const noFeatureImports = {
  group: ['@/features/*', '@/features/**'],
  message:
    'Shared code cannot import from `features/`. Inject what you need through props.',
};

const otherFeatureImports = (feature) => ({
  group: [
    '@/features/*',
    '@/features/**',
    `!@/features/${feature}`,
    `!@/features/${feature}/**`,
  ],
  message:
    'Imports between features are not allowed. Compose features in `src/app/routes`.',
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
      // --- Architecture -------------------------------------------------------
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

      // --- File and folder naming --------------------------------------------
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/!(__tests__)': 'KEBAB_CASE' },
      ],

      // --- Symbol naming ------------------------------------------------------
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
        // Destructuring renames (`{ default: Component }`) and data coming
        // from external APIs do not follow our rules.
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
            'Magic string: compare against a named constant (config/constants) instead of a literal.',
        },
        {
          selector: "JSXAttribute[name.name='to'] > Literal",
          message:
            'Magic string: use `paths.*.getHref()` from `@/config/paths` instead of a literal route.',
        },
        {
          selector:
            "CallExpression[callee.object.name='localStorage'] > Literal:first-child, CallExpression[callee.object.name='sessionStorage'] > Literal:first-child",
          message:
            'Magic string: define the storage key in `@/config/storage-keys`.',
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

      // --- General quality ----------------------------------------------------
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
  // Only `src/config` (and the bootstrap) read raw environment variables.
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
            'Do not read `import.meta.env` directly: export it typed from `@/config/env`.',
        },
        {
          selector:
            "BinaryExpression[operator=/^[=!]==?$/]:not([left.type='UnaryExpression']) > Literal[value=/^[A-Za-z]/]",
          message:
            'Magic string: compare against a named constant (config/constants) instead of a literal.',
        },
        {
          selector: "JSXAttribute[name.name='to'] > Literal",
          message:
            'Magic string: use `paths.*.getHref()` from `@/config/paths` instead of a literal route.',
        },
        {
          selector:
            "CallExpression[callee.object.name='localStorage'] > Literal:first-child, CallExpression[callee.object.name='sessionStorage'] > Literal:first-child",
          message:
            'Magic string: define the storage key in `@/config/storage-keys`.',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'process',
          message: 'Use `@/config/env` instead of `process.env`.',
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Shared layer: it knows neither features nor app.
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
  // Per feature: every feature can only import itself.
  // `src/app` can import any feature (base rule).
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
  // Exceptions to the architecture rules:
  // - `src/main.tsx` is the composition root: it mounts `src/app`.
  // - `src/testing` is test/mock infrastructure: it knows everybody.
  // ---------------------------------------------------------------------------
  {
    files: ['src/main.tsx', 'src/testing/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      'import-x/no-restricted-paths': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // Centralized configuration: the literals live here, so the magic-value rules
  // are relaxed.
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
