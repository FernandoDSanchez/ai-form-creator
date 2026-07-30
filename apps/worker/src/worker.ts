import { formGenerationTaskQueue } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import { NativeConnection, Worker } from '@temporalio/worker';

import { createFormGenerationActivities } from './activities/create-form-generation-activities';
import { FormGenerationStore } from './activities/form-generation-store';
import { env } from './config/env';

/**
 * Composition root of the worker: it builds the world and hands it to Temporal.
 *
 * It is the only file joining the three layers — it reads the configuration,
 * opens the Postgres pool and registers the activities — just like `main.ts` in
 * the back.
 *
 * `workflowsPath` points at the workflow file, not at an index folder: the SDK
 * bundles it separately for the deterministic sandbox, and that bundle has to
 * contain the workflow and its domain, nothing else. In production it resolves
 * to the compiled `.js` inside `dist/`.
 */
async function bootstrap(): Promise<void> {
  const store = new FormGenerationStore();

  // `NativeConnection` and not `Connection`: the worker uses the Rust core,
  // which has its own transport. The `Connection` of `@temporalio/client` is
  // the client-side one and is of no use here.
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
    // `Worker.run()` resolves once the orderly shutdown completes: it stops
    // taking new tasks and waits for the in-flight ones to close.
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
  // No Temporal logger yet: if `bootstrap` failed, there may be none.
  // `process.stderr` is the only guaranteed thing, and the `exitCode` is what
  // makes Kubernetes restart the pod instead of leaving it alive and mute.
  process.stderr.write(
    `The worker could not start: ${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
