import { formGenerationTaskQueue } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import { NativeConnection, Worker } from '@temporalio/worker';

import { createFormGenerationActivities } from './activities/create-form-generation-activities';
import { FormGenerationStore } from './activities/form-generation-store';
import { env } from './config/env';

/**
 * Raíz de composición del worker: arma el mundo y se lo entrega a Temporal.
 *
 * Es el único archivo que junta las tres capas —lee la configuración, abre el
 * pool de Postgres y registra las actividades— igual que `main.ts` en el back.
 *
 * `workflowsPath` apunta al archivo del workflow, no a una carpeta índice: el
 * SDK lo empaqueta aparte para el sandbox determinista, y ese paquete tiene que
 * contener el workflow y su dominio, nada más. En producción resuelve al `.js`
 * compilado dentro de `dist/`.
 */
async function bootstrap(): Promise<void> {
  const store = new FormGenerationStore();

  // `NativeConnection` y no `Connection`: el worker usa el core en Rust, que
  // tiene su propio transporte. La `Connection` de `@temporalio/client` es la
  // del lado cliente y acá no sirve.
  const connection = await NativeConnection.connect({
    address: env.TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: formGenerationTaskQueue,
    workflowsPath: require.resolve('./workflows/generate-form.workflow'),
    activities: createFormGenerationActivities(store),
  });

  const shutdown = () => {
    // `Worker.run()` resuelve cuando termina el apagado ordenado: deja de
    // tomar tareas nuevas y espera a que cierren las que están en curso.
    worker.shutdown();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  try {
    await worker.run();
  } finally {
    await connection.close();
    await store.close();
  }
}

bootstrap().catch((error: unknown) => {
  // Sin logger de Temporal todavía: si `bootstrap` falló, puede no haber
  // ninguno. `process.stderr` es lo único garantizado, y el `exitCode` es lo
  // que hace que Kubernetes reinicie el pod en vez de dejarlo vivo y mudo.
  process.stderr.write(
    `El worker no pudo arrancar: ${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
