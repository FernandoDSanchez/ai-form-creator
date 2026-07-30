import {
  formFieldComponents,
  formFieldDecorators,
} from '@ai-form-creator/contracts/form-generation/form-field-component';
import { formFieldNames } from '@ai-form-creator/contracts/form-generation/form-field-name';
import type {
  FormGeneration,
  NewFormGeneration,
} from '@ai-form-creator/contracts/form-generation/form-generation';
import { formGenerationStatuses } from '@ai-form-creator/contracts/form-generation/form-generation-status';
import type { FormilyFormSchema } from '@ai-form-creator/contracts/form-generation/formily-form-schema';
import type { GeneratedForm } from '@ai-form-creator/contracts/form-generation/generated-form';

/**
 * Simulation of the whole pipeline, in memory.
 *
 * With the API mocked there is no Temporal and no WebSocket, so progress is
 * simulated: every read of the detail moves the request one step. The front
 * polls while the status is not terminal, which means the screen walks the
 * pipeline just like against the real back — only at the pace of the refetch.
 *
 * It serves two purposes: developing the screen without the cluster up, and
 * leaving the journey documented in code.
 */

/** The happy path, in order. The last one is where it halts to wait. */
const statusSequence = [
  formGenerationStatuses.pending,
  formGenerationStatuses.retrieving,
  formGenerationStatuses.generating,
  formGenerationStatuses.validating,
  formGenerationStatuses.awaitingReview,
] as const;

const sampleDraft: GeneratedForm = {
  title: 'Import declaration with sanitary control',
  description: 'Data required for goods subject to sanitary control to enter.',
  fields: [
    {
      name: formFieldNames.importerTaxId,
      title: 'Importer identification',
      component: formFieldComponents.text,
      isRequired: true,
      helpText: 'Exactly as it appears in the customs register.',
      placeholder: 'J-12345678-9',
      options: [],
    },
    {
      name: formFieldNames.hsTariffCode,
      title: 'Tariff code',
      component: formFieldComponents.text,
      isRequired: true,
      helpText: '',
      placeholder: '0201.10.00',
      options: [],
    },
    {
      name: formFieldNames.customsRegime,
      title: 'Customs regime',
      component: formFieldComponents.select,
      isRequired: true,
      helpText: '',
      placeholder: '',
      options: [
        { label: 'Definitive import', value: 'definitive' },
        { label: 'Temporary admission', value: 'temporary' },
        { label: 'Customs transit', value: 'transit' },
      ],
    },
    {
      name: formFieldNames.arrivalDate,
      title: 'Arrival date',
      component: formFieldComponents.date,
      isRequired: true,
      helpText: '',
      placeholder: '',
      options: [],
    },
    {
      name: formFieldNames.declarationAccepted,
      title: 'Sworn declaration',
      component: formFieldComponents.checkbox,
      isRequired: true,
      helpText: 'I am aware of the penalties for a false declaration.',
      placeholder: '',
      options: [],
    },
  ],
};

/**
 * The already compiled draft.
 *
 * Written by hand because the compiler lives in `apps/worker` and the front
 * does not have it. It is the only part of the mock that can drift from the
 * real thing; the names still come from the contract constants, so what could
 * diverge is the shape, not the vocabulary.
 */
const sampleFormilySchema: FormilyFormSchema = {
  type: 'object',
  properties: Object.fromEntries(
    sampleDraft.fields.map((field) => [
      field.name,
      {
        type: (
          {
            [formFieldComponents.text]: 'string',
            [formFieldComponents.textarea]: 'string',
            [formFieldComponents.number]: 'number',
            [formFieldComponents.select]: 'string',
            [formFieldComponents.checkbox]: 'boolean',
            [formFieldComponents.radioGroup]: 'string',
            [formFieldComponents.date]: 'string',
          } as const
        )[field.component],
        title: field.title,
        required: field.isRequired,
        ...(field.options.length > 0 ? { enum: field.options } : {}),
        ...(field.placeholder.length > 0
          ? { 'x-component-props': { placeholder: field.placeholder } }
          : {}),
        ...(field.helpText.length > 0
          ? { 'x-decorator-props': { help: field.helpText } }
          : {}),
        'x-decorator': formFieldDecorators.formItem,
        'x-component': field.component,
      },
    ]),
  ),
};

const formGenerationsDb = new Map<string, FormGeneration>();

export const createFormGeneration = (
  request: NewFormGeneration,
): FormGeneration => {
  const now = new Date().toISOString();
  const formGeneration: FormGeneration = {
    id: crypto.randomUUID(),
    prompt: request.prompt,
    regulatoryDocumentIds: request.regulatoryDocumentIds,
    status: formGenerationStatuses.pending,
    attempts: 0,
    draft: null,
    formilySchema: null,
    failureReason: null,
    reviewerNote: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  formGenerationsDb.set(formGeneration.id, formGeneration);

  return formGeneration;
};

export const listFormGenerations = (): FormGeneration[] =>
  [...formGenerationsDb.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

/**
 * Returns the request and, along the way, moves it one step forward.
 *
 * That reading has an effect is a deliberate lie of the mock: in the real
 * system what moves the status is the worker, and here there is no worker. The
 * front's polling acts as the clock.
 */
export const advanceFormGeneration = (
  formGenerationId: string,
): FormGeneration | null => {
  const current = formGenerationsDb.get(formGenerationId);

  if (!current) {
    return null;
  }

  const index = statusSequence.indexOf(
    current.status as (typeof statusSequence)[number],
  );

  // Outside the sequence (terminal) or already on the last step: it stops moving.
  if (index < 0 || index === statusSequence.length - 1) {
    return current;
  }

  const nextStatus = statusSequence[index + 1] ?? current.status;
  const isReady = nextStatus === formGenerationStatuses.awaitingReview;

  const advanced: FormGeneration = {
    ...current,
    status: nextStatus,
    attempts:
      nextStatus === formGenerationStatuses.generating ? 1 : current.attempts,
    draft: isReady ? sampleDraft : current.draft,
    formilySchema: isReady ? sampleFormilySchema : current.formilySchema,
    updatedAt: new Date().toISOString(),
  };

  formGenerationsDb.set(formGenerationId, advanced);

  return advanced;
};

export const reviewFormGeneration = (
  formGenerationId: string,
  status: FormGeneration['status'],
  reviewerNote: string,
): FormGeneration | null => {
  const current = formGenerationsDb.get(formGenerationId);

  if (!current) {
    return null;
  }

  const reviewed: FormGeneration = {
    ...current,
    status,
    reviewerNote,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  formGenerationsDb.set(formGenerationId, reviewed);

  return reviewed;
};

/** Tests start from scratch: the map lives across test files. */
export const resetFormGenerations = (): void => {
  formGenerationsDb.clear();
};
