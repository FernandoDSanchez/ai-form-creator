import { formGenerationStatuses } from '@ai-form-creator/contracts/form-generation/form-generation-status';
import type { GenerateFormWorkflowInput } from '@ai-form-creator/contracts/form-generation/form-generation-workflow';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';

import type { FormGenerationActivities } from '../../domain/ports/form-generation-activities.port';

/**
 * This file tests the **order and the guarantees** of the workflow, not the
 * logic of generating: the activities are doubles.
 *
 * What motivated writing it was a real failure in the deployment. LiteLLM
 * returned 404 (the model had been withdrawn), the workflow died as it should…
 * and the row stayed in GENERATING forever, because nobody wrote the failure
 * down. Temporal recorded it, but the database did not, and without a status
 * change there is no `NOTIFY`: the front kept showing "Drafting…"
 * indefinitely.
 *
 * It runs against the SDK's test server, which starts a real Temporal in memory
 * and skips time. That is why a 30-day wait takes milliseconds.
 */

const TASK_QUEUE = 'test-form-generation';
const FORM_GENERATION_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const anInput = (): GenerateFormWorkflowInput => ({
  formGenerationId: FORM_GENERATION_ID,
  prompt: 'Import declaration form.',
  regulatoryDocuments: [],
});

const aDraft = () => ({
  title: 'Import declaration',
  description: '',
  fields: [
    {
      name: 'entityLegalName' as const,
      title: 'Legal name',
      component: 'TextField' as const,
      isRequired: true,
      helpText: '',
      placeholder: '',
      options: [],
    },
  ],
});

/** Doubles that record what they were asked for. */
const createActivities = (
  overrides: Partial<FormGenerationActivities> = {},
): FormGenerationActivities => ({
  markStatus: jest.fn().mockResolvedValue(undefined),
  retrieveRegulatoryContext: jest.fn().mockResolvedValue(''),
  requestFormDraft: jest.fn().mockResolvedValue(JSON.stringify(aDraft())),
  validateFormDraft: jest
    .fn()
    .mockResolvedValue({ isValid: true, draft: aDraft() }),
  saveGeneratedForm: jest.fn().mockResolvedValue(undefined),
  failFormGeneration: jest.fn().mockResolvedValue(undefined),
  applyReview: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('generateForm', () => {
  let env: TestWorkflowEnvironment;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();
  }, 120_000);

  afterAll(async () => {
    await env?.teardown();
  });

  const runWith = async (
    activities: FormGenerationActivities,
    onStarted?: (handle: {
      signal: (name: string, payload: unknown) => Promise<void>;
    }) => Promise<void>,
  ): Promise<unknown> => {
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: TASK_QUEUE,
      workflowsPath: require.resolve('../generate-form.workflow'),
      activities,
    });

    return worker.runUntil(async (): Promise<unknown> => {
      const handle = await env.client.workflow.start('generateForm', {
        taskQueue: TASK_QUEUE,
        workflowId: `test-${Math.random().toString(36).slice(2)}`,
        args: [anInput()],
      });

      await onStarted?.(handle as never);

      return handle.result();
    });
  };

  it('marks FAILED in the database when an activity fails beyond repair', async () => {
    // The exact case that broke in production: LiteLLM returning 404.
    const activities = createActivities({
      requestFormDraft: jest
        .fn()
        .mockRejectedValue(new Error('LiteLLM answered HTTP 404')),
    });

    await expect(runWith(activities)).rejects.toThrow();

    expect(activities.failFormGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ formGenerationId: FORM_GENERATION_ID }),
    );
  });

  it('propagates the real reason and not Temporal\'s "Activity task failed"', async () => {
    const activities = createActivities({
      requestFormDraft: jest
        .fn()
        .mockRejectedValue(new Error('the model is no longer available')),
    });

    await expect(runWith(activities)).rejects.toThrow();

    const [call] = (activities.failFormGeneration as jest.Mock).mock.calls.at(
      -1,
    ) as [{ reason: string }];

    expect(call.reason).toContain('the model is no longer available');
  });

  it('halts at AWAITING_REVIEW and waits: the AI does not publish on its own', async () => {
    const activities = createActivities();

    const status = await runWith(activities, async (handle) => {
      // The workflow has to stay alive until the signal arrives. If it
      // published on its own, `result()` would have resolved without this.
      await handle.signal('review', {
        decision: 'APPROVE',
        reviewerNote: 'ok',
      });
    });

    expect(activities.saveGeneratedForm).toHaveBeenCalledTimes(1);
    expect(activities.applyReview).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'APPROVE' }),
    );
    expect(status).toBe(formGenerationStatuses.approved);
  });

  it('retries with the errors inside and gives up after the cap', async () => {
    const activities = createActivities({
      validateFormDraft: jest
        .fn()
        .mockResolvedValue({ isValid: false, problems: ['`options` missing'] }),
    });

    const status = await runWith(activities);

    // Three attempts, and from the second one the prompt carries the previous
    // problems: that is what separates a useful retry from repeating the ask.
    expect(activities.requestFormDraft).toHaveBeenCalledTimes(3);
    expect(
      (activities.requestFormDraft as jest.Mock).mock.calls[1]?.[0].problems,
    ).toEqual(['`options` missing']);
    expect(activities.saveGeneratedForm).not.toHaveBeenCalled();
    expect(status).toBe(formGenerationStatuses.failed);
  });
});
