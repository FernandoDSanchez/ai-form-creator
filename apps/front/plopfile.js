import { execFileSync } from 'node:child_process';

/**
 * Code generators: `npm run generate`.
 * They keep the architecture (bulletproof-react) without relying on memory.
 */
const lintFix = (targetPath) => () => {
  execFileSync('npx', ['eslint', targetPath, '--fix'], { stdio: 'inherit' });
  return `formatted with eslint --fix: ${targetPath}`;
};

export default function plop(plopApi) {
  plopApi.setGenerator('feature', {
    description: 'New feature in src/features',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Feature name (kebab-case, e.g. form-builder):',
      },
      {
        type: 'input',
        name: 'entity',
        message: 'Main entity (singular, e.g. form-template):',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/features/{{kebabCase name}}/config/api-endpoints.ts',
        templateFile: 'generators/feature/api-endpoints.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/features/{{kebabCase name}}/types/{{kebabCase entity}}.ts',
        templateFile: 'generators/feature/types.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/features/{{kebabCase name}}/api/get-{{kebabCase entity}}s.ts',
        templateFile: 'generators/feature/get-list.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/features/{{kebabCase name}}/components/{{kebabCase entity}}s-list.tsx',
        templateFile: 'generators/feature/list-component.tsx.hbs',
      },
      (answers) =>
        lintFix(
          `src/features/${plopApi.getHelper('kebabCase')(answers.name)}`,
        )(),
      () =>
        [
          '',
          'Next steps:',
          '  1. Add the route in src/config/paths.ts',
          '  2. Create src/app/routes/... and register it in src/app/router.tsx',
          '  3. Add the mock handlers in src/testing/mocks/handlers',
          '  4. Restart ESLint: the new feature enters the restricted zones on its own',
          '',
        ].join('\n'),
    ],
  });

  plopApi.setGenerator('component', {
    description: 'Shared component in src/components/ui',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name (kebab-case, e.g. date-picker):',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/components/ui/{{kebabCase name}}/{{kebabCase name}}.tsx',
        templateFile: 'generators/component/component.tsx.hbs',
      },
      {
        type: 'add',
        path: 'src/components/ui/{{kebabCase name}}/__tests__/{{kebabCase name}}.test.tsx',
        templateFile: 'generators/component/component.test.tsx.hbs',
      },
      (answers) =>
        lintFix(
          `src/components/ui/${plopApi.getHelper('kebabCase')(answers.name)}`,
        )(),
    ],
  });
}
