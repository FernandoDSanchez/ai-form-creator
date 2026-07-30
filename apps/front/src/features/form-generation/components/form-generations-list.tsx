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
        You have not requested any form yet.
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
              {formGeneration.draft?.title ?? 'No title yet'}
            </Link>
            {/* The raw request is what tells apart two requests that do not
                have a title yet. `line-clamp` instead of cutting the text in
                JS: that way the browser decides based on the real width. */}
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
