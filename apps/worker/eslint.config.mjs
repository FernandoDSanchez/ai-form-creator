import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * The worker architecture is not a taste of ours: Temporal imposes it.
 *
 *   config → worker.ts
 *   activities → domain
 *   workflows → domain          (NEVER → activities, NEVER → config)
 *   domain → nothing
 *
 * Workflow code does not run like normal code: it runs in a deterministic
 * sandbox, re-executed from scratch every time the worker restarts or is
 * replaced. In there is no network, no disk, no `process.env`, and anything
 * returning a different result on the second run breaks the execution. A wrong
 * `import` does not fail at compile time: it fails in production, on a
 * re-execution, with a `Nondeterminism error` three days later.
 *
 * That is why the layers here look so much like the back's (`CLAUDE.md` §9):
 * `domain/` is pure for the same reason as there, `activities/` is the
 * infrastructure — the only place with IO — and `workflows/` only orchestrates.
 * That the workflow cannot import `activities/` is what forces it to talk to
 * them through a port (`domain/ports/form-generation-activities.port.ts`),
 * which is exactly what Temporal wants: the workflow declares what it needs,
 * and `proxyActivities` resolves it over RPC.
 */
const workerZones = [
  {
    target: './src/domain',
    from: ['./src/activities', './src/workflows', './src/config'],
    message:
      'The domain is pure: no IO, no Temporal and no environment variables. ' +
      'If you need something from outside, declare it as a port in `domain/ports/`.',
  },
  {
    target: './src/workflows',
    from: ['./src/activities', './src/config'],
    message:
      'A workflow cannot touch an activity or the configuration: it runs in a ' +
      'deterministic sandbox, with no network and no `process.env`. Talk to the ' +
      'activities through the `domain/ports/` port and `proxyActivities`.',
  },
  {
    target: './src/activities',
    from: './src/workflows',
    message:
      'Activities do not know the workflow using them. The dependency goes ' +
      'workflow → port ← activity.',
  },
];

/** Everything that cannot exist inside a workflow sandbox. */
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
    'Forbidden inside a workflow: there is no IO and no Node modules in the ' +
    'deterministic sandbox. Move it to `activities/`.',
};

/** The same, plus Temporal: the domain does not even know it exists. */
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
    'The domain knows neither the orchestration engine nor the outside world. ' +
    'Move it to `activities/` or declare it as a port.',
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
      // --- architecture ---
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

      // --- naming (CLAUDE.md §2) ---
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
        // External payloads (LiteLLM, RAGFlow) and Postgres columns use
        // snake_case.
        { selector: 'objectLiteralProperty', format: null },
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
      // The worker logs with Temporal's logger, which does reach the pod logs
      // with workflow context. `console` leaves them orphaned.
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

  // Tests may be lax with types: the doubles lie on purpose.
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

  // The bootstrap and the config are the composition root: they read
  // `process.env` and build the world. They are the exception, just like
  // `main.ts` in the back.
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
