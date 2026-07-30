import { Link } from '@/components/ui/link/link';
import { Spinner } from '@/components/ui/spinner/spinner';
import { appConfig } from '@/config/app-config';
import { paths } from '@/config/paths';
import { cn } from '@/utils/cn';

import { useFormTemplates } from '../api/get-form-templates';

import { FormStatusBadge } from './form-status-badge';

const dateFormatter = new Intl.DateTimeFormat(appConfig.locale, {
  dateStyle: 'medium',
});

export const FormTemplatesList = () => {
  const formTemplatesQuery = useFormTemplates();

  if (formTemplatesQuery.isLoading) {
    return (
      <div className="py-xl flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const formTemplates = formTemplatesQuery.data ?? [];

  if (formTemplates.length === 0) {
    return (
      <p className="text-content-muted text-sm">
        There are no forms yet. Create the first one from the generator.
      </p>
    );
  }

  return (
    <ul className="gap-md grid sm:grid-cols-2">
      {formTemplates.map((formTemplate) => (
        <li
          key={formTemplate.id}
          className={cn(
            'bg-surface border-border shadow-card p-md rounded-lg border',
          )}
        >
          <div className="gap-sm flex items-start justify-between">
            <h2 className="text-content text-base font-semibold">
              {formTemplate.title}
            </h2>
            <FormStatusBadge status={formTemplate.status} />
          </div>

          <p className="text-content-muted mt-xs text-sm">
            {formTemplate.description}
          </p>

          <div className="text-content-muted mt-md flex items-center justify-between text-xs">
            <span>{formTemplate.fieldCount} fields</span>
            <span>
              Updated {dateFormatter.format(new Date(formTemplate.updatedAt))}
            </span>
          </div>

          <Link
            to={paths.forms.detail.getHref(formTemplate.id)}
            className="mt-md inline-block text-sm"
          >
            Open form →
          </Link>
        </li>
      ))}
    </ul>
  );
};
