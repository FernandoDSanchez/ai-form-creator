import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(rootDir, 'src');

/**
 * Bounded contexts are discovered on disk: any folder of `src/` with a
 * `domain/` inside it. Adding a new context is protected without touching this
 * file (same criterion as the front's `eslint.config.js`).
 */
const contextNames = fs.existsSync(srcDir)
  ? fs
      .readdirSync(srcDir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          fs.existsSync(path.join(srcDir, entry.name, 'domain')),
      )
      .map((entry) => entry.name)
  : [];

/**
 * Hexagonal architecture: dependencies point INWARDS.
 *
 *   infrastructure → application → domain
 *
 * The domain knows nobody; the application knows only the domain; the
 * infrastructure knows both. Never the other way around.
 */
const hexagonalZones = contextNames.flatMap((context) => [
  {
    target: `./src/${context}/domain`,
    from: [`./src/${context}/application`, `./src/${context}/infrastructure`],
    message:
      'The domain cannot depend on the application or the infrastructure. ' +
      'If you need something from outside, declare it as a port in `domain/ports/`.',
  },
  {
    target: `./src/${context}/application`,
    from: [`./src/${context}/infrastructure`],
    message:
      'The application depends on ports, not on adapters. The concrete wiring ' +
      'goes in the Nest module.',
  },
  {
    // No context may reach into another: they talk through their public layer.
    target: `./src/${context}`,
    from: './src',
    except: [`./${context}`, './shared', './config'],
    message:
      'Imports between bounded contexts are not allowed. Compose in the application layer.',
  },
  {
    // `shared/` is generic infrastructure: it cannot depend on a context.
    target: './src/shared',
    from: `./src/${context}`,
    message: '`shared/` cannot depend on a bounded context.',
  },
]);

/**
 * Complement by import pattern: `no-restricted-paths` covers project paths,
 * this covers node_modules packages.
 */
const frameworkPackages = {
  group: [
    '@nestjs',
    '@nestjs/*',
    '@prisma/client',
    'express',
    'multer',
    '@nestjs/**',
  ],
  message:
    'The core (domain/application) knows neither the framework nor the ORM. ' +
    'Move the dependency to `infrastructure/`.',
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'prisma/**'],
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
        // `allowDefaultProject`: this file is not in the tsconfig (which only
        // includes `src/`), but we lint it anyway.
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
      // --- architecture ---
      'import-x/no-restricted-paths': ['error', { zones: hexagonalZones }],
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

      // --- naming (same conventions as the front, CLAUDE.md §2) ---
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
        {
          selector: 'objectLiteralProperty',
          format: null, // external payloads (RAGFlow) use snake_case
        },
        { selector: 'typeProperty', format: null },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        { selector: 'classProperty', format: ['camelCase'] },
        { selector: 'classMethod', format: ['camelCase'] },
      ],

      // --- quality ---
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
      'no-console': 'error', // use the Nest Logger
    },
  },

  // The core does not touch the framework.
  {
    files: ['src/*/domain/**/*.ts', 'src/*/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [frameworkPackages] }],
    },
  },

  // Tests may be lax with types: the doubles lie on purpose.
  {
    files: ['**/__tests__/**/*.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // The bootstrap and the config are the composition root: they read
  // `process.env` and build the world. They are the exception, just like
  // `main.tsx` in the front.
  {
    files: ['src/main.ts', 'src/config/**/*.ts', 'eslint.config.mjs'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },

  // ESLint plugins export default + named under the same name; the warning is
  // a false positive from the config file itself.
  {
    files: ['eslint.config.mjs'],
    rules: {
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },
);
