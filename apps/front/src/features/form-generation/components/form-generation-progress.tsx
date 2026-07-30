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
 * El recorrido, con el paso actual marcado.
 *
 * Lo que hace útil a esta pantalla no es la barra sino el texto de abajo: quien
 * pidió el formulario está mirando una espera que puede durar un minuto, y
 * «Redactando» sin más no le dice si eso es normal o si algo se colgó. La
 * descripción de cada estado sale del mismo `Record` que la etiqueta.
 */
export const FormGenerationProgress = ({
  formGeneration,
}: FormGenerationProgressProps) => {
  const variant = formGenerationStatusVariants[formGeneration.status];

  // REPAIRING no es un paso propio: es un rulo sobre GENERATING. Se ubica ahí
  // para que la barra no parezca retroceder cuando el modelo se equivoca.
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
              // `currentStep` es -1 en los estados terminales que no están en
              // la lista: ahí no se pinta ninguno como alcanzado.
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
          Intento {formGeneration.attempts}: el modelo tuvo que corregir lo que
          había generado.
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
