import { Spinner } from '@/components/ui/spinner/spinner';
import { cn } from '@/utils/cn';

import {
  formGenerationProgressSteps,
  formGenerationStatusVariants,
} from '../config/form-generation-status';
import {
  formGenerationStatuses,
  type FormGeneration,
} from '../types/form-generation';

import { FormGenerationStatusBadge } from './form-generation-status-badge';

type FormGenerationProgressProps = {
  formGeneration: FormGeneration;
};

/**
 * The journey, with the current step marked.
 *
 * What makes this screen useful is not the bar but the text below it: whoever
 * requested the form is staring at a wait that can last a minute, and
 * "Drafting" on its own does not tell them whether that is normal or whether
 * something hung. Each status description comes from the same `Record` as the
 * label.
 */
export const FormGenerationProgress = ({
  formGeneration,
}: FormGenerationProgressProps) => {
  const variant = formGenerationStatusVariants[formGeneration.status];

  // REPAIRING is not a step of its own: it is a loop over GENERATING. It is
  // placed there so the bar does not seem to go backwards when the model gets
  // it wrong.
  const currentStatus =
    formGeneration.status === formGenerationStatuses.repairing
      ? formGenerationStatuses.generating
      : formGeneration.status;

  const currentStep = formGenerationProgressSteps.indexOf(
    currentStatus as (typeof formGenerationProgressSteps)[number],
  );

  return (
    <section className="bg-surface border-border shadow-card p-md gap-md flex flex-col rounded-lg border">
      <header className="gap-sm flex flex-wrap items-center justify-between">
        <div className="gap-sm flex items-center">
          {variant.isBusy ? <Spinner size="sm" /> : null}
          <h2 className="text-content text-base font-semibold">
            {variant.label}
          </h2>
        </div>
        <FormGenerationStatusBadge status={formGeneration.status} />
      </header>

      <ol className="gap-2xs flex">
        {formGenerationProgressSteps.map((step, index) => (
          <li
            key={step}
            className={cn(
              'h-1 flex-1 rounded-full',
              // `currentStep` is -1 on the terminal statuses that are not in
              // the list: there none is painted as reached.
              currentStep >= 0 && index <= currentStep
                ? 'bg-brand-600'
                : 'bg-surface-sunken',
            )}
          >
            <span className="sr-only">
              {formGenerationStatusVariants[step].label}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-content-muted text-sm">{variant.description}</p>

      {formGeneration.attempts > 1 ? (
        <p className="text-content-muted text-xs">
          Attempt {formGeneration.attempts}: the model had to correct what it
          had generated.
        </p>
      ) : null}

      {formGeneration.failureReason ? (
        <p role="alert" className="text-danger text-sm">
          {formGeneration.failureReason}
        </p>
      ) : null}
    </section>
  );
};
