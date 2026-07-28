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
 * Los contextos acotados se descubren en disco: cualquier carpeta de `src/`
 * que tenga un `domain/` adentro. Agregar un contexto nuevo queda protegido
 * sin tocar este archivo (mismo criterio que el `eslint.config.js` del front).
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
 * Arquitectura hexagonal: las dependencias apuntan HACIA ADENTRO.
 *
 *   infrastructure → application → domain
 *
 * El dominio no conoce a nadie; la aplicación conoce sólo al dominio; la
 * infraestructura conoce a los dos. Al revés, nunca.
 */
const hexagonalZones = contextNames.flatMap((context) => [
  {
    target: `./src/${context}/domain`,
    from: [`./src/${context}/application`, `./src/${context}/infrastructure`],
    message:
      'El dominio no puede depender de la aplicación ni de la infraestructura. ' +
      'Si necesitás algo de afuera, declaralo como puerto en `domain/ports/`.',
  },
  {
    target: `./src/${context}/application`,
    from: [`./src/${context}/infrastructure`],
    message:
      'La aplicación depende de puertos, no de adaptadores. El cableado ' +
      'concreto va en el módulo de Nest.',
  },
  {
    // Ningún contexto puede meter mano en otro: se hablan por su capa pública.
    target: `./src/${context}`,
    from: './src',
    except: [`./${context}`, './shared', './config'],
    message:
      'No se permiten imports entre contextos acotados. Compón en la capa de aplicación.',
  },
  {
    // `shared/` es infraestructura genérica: no puede depender de un contexto.
    target: './src/shared',
    from: `./src/${context}`,
    message: '`shared/` no puede depender de un contexto acotado.',
  },
]);

/**
 * Complemento por patrón de import: `no-restricted-paths` cubre rutas del
 * proyecto, esto cubre paquetes de node_modules.
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
    'El núcleo (domain/application) no conoce el framework ni el ORM. ' +
    'Mové la dependencia a `infrastructure/`.',
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
        // `allowDefaultProject`: este archivo no está en el tsconfig (que sólo
        // incluye `src/`), pero igual lo linteamos.
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

      // --- nombrado (mismas convenciones que el front, CLAUDE.md §2) ---
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
          format: null, // los payloads externos (RAGFlow) usan snake_case
        },
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
      'no-console': 'error', // usar el Logger de Nest
    },
  },

  // El núcleo no toca el framework.
  {
    files: ['src/*/domain/**/*.ts', 'src/*/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [frameworkPackages] }],
    },
  },

  // Los tests sí pueden ser laxos con los tipos: los dobles mienten a propósito.
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

  // El bootstrap y la config son la raíz de composición: leen `process.env`
  // y arman el mundo. Son la excepción, igual que `main.tsx` en el front.
  {
    files: ['src/main.ts', 'src/config/**/*.ts', 'eslint.config.mjs'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },

  // Los plugins de ESLint exportan default + named con el mismo nombre; la
  // advertencia es un falso positivo del propio archivo de config.
  {
    files: ['eslint.config.mjs'],
    rules: {
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },
);
