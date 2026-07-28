import type { ReactNode } from 'react';

import { AppLayout } from './app-layout';

type ContentLayoutProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export const ContentLayout = ({
  title,
  description,
  actions,
  children,
}: ContentLayoutProps) => (
  <AppLayout>
    <div className="mb-lg gap-md flex flex-wrap items-end justify-between">
      <div>
        <h1 className="text-content text-2xl font-semibold">{title}</h1>
        {description ? (
          <p className="text-content-muted mt-xs text-sm">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
    {children}
  </AppLayout>
);
