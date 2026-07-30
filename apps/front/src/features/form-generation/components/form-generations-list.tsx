import { Link } from '@/components/ui/link/link';
import { appConfig } from '@/config/app-config';
import { paths } from '@/config/paths';

import type { FormGeneration } from '../types/form-generation';

import { FormGenerationStatusBadge } from './form-generation-status-badge';

const dateFormatter = new Intl.DateTimeFormat(appConfig.locale, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type FormGenerationsListProps = {
  formGenerations: FormGeneration[];
};

export const FormGenerationsList = ({
  formGenerations,
}: FormGenerationsListProps) => {
  if (formGenerations.length === 0) {
    return (
      <p className="text-content-muted text-sm">
        Todavía no pediste ningún formulario.
      </p>
    );
  }

  return (
    <ul className="gap-sm flex flex-col">
      {formGenerations.map((formGeneration) => (
        <li
          key={formGeneration.id}
          className="bg-surface border-border shadow-card p-md gap-sm flex flex-wrap items-center justify-between rounded-lg border"
        >
          <div className="min-w-0">
            <Link
              to={paths.formGenerations.detail.getHref(formGeneration.id)}
              className="text-content text-sm font-medium"
            >
              {formGeneration.draft?.title ?? 'Sin título todavía'}
            </Link>
            {/* El pedido en crudo es lo que distingue dos solicitudes que
                todavía no tienen título. `line-clamp` en vez de cortar el texto
                en JS: así el navegador decide según el ancho real. */}
            <p className="text-content-muted mt-2xs line-clamp-2 text-xs">
              {formGeneration.prompt}
            </p>
            <p className="text-content-muted mt-2xs text-xs">
              {dateFormatter.format(new Date(formGeneration.createdAt))}
            </p>
          </div>
          <FormGenerationStatusBadge status={formGeneration.status} />
        </li>
      ))}
    </ul>
  );
};
