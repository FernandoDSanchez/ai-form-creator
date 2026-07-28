import { execFileSync } from 'node:child_process';

/**
 * Generadores de código: `npm run generate`.
 * Mantienen la arquitectura (bulletproof-react) sin depender de la memoria.
 */
const lintFix = (targetPath) => () => {
  execFileSync('npx', ['eslint', targetPath, '--fix'], { stdio: 'inherit' });
  return `formateado con eslint --fix: ${targetPath}`;
};

export default function plop(plopApi) {
  plopApi.setGenerator('feature', {
    description: 'Nueva feature en src/features',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Nombre de la feature (kebab-case, ej: form-builder):',
      },
      {
        type: 'input',
        name: 'entity',
        message: 'Entidad principal (singular, ej: form-template):',
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
          'Siguientes pasos:',
          '  1. Añade la ruta en src/config/paths.ts',
          '  2. Crea src/app/routes/... y regístrala en src/app/router.tsx',
          '  3. Añade los handlers de mock en src/testing/mocks/handlers',
          '  4. Reinicia ESLint: la nueva feature entra sola en las zonas restringidas',
          '',
        ].join('\n'),
    ],
  });

  plopApi.setGenerator('component', {
    description: 'Componente compartido en src/components/ui',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Nombre del componente (kebab-case, ej: date-picker):',
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
