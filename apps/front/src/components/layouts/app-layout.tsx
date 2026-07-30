import { FileStack } from 'lucide-react';
import type { ReactNode } from 'react';

import { Link } from '@/components/ui/link/link';
import { appConfig } from '@/config/app-config';
import { paths } from '@/config/paths';

type AppLayoutProps = {
  children: ReactNode;
};

export const AppLayout = ({ children }: AppLayoutProps) => (
  <div className="flex min-h-full flex-col">
    <header className="bg-surface border-border border-b">
      <div className="gap-sm px-md max-w-page mx-auto flex h-16 w-full items-center">
        <FileStack aria-hidden className="text-brand-600 size-6" />
        <Link
          to={paths.home.getHref()}
          className="text-content text-base no-underline hover:no-underline"
        >
          {appConfig.name}
        </Link>
        <nav className="gap-md ml-auto flex items-center">
          <Link to={paths.forms.root.getHref()} className="text-sm">
            Forms
          </Link>
          <Link
            to={paths.regulatoryDocuments.root.getHref()}
            className="text-sm"
          >
            Documents
          </Link>
          <Link to={paths.formGenerations.root.getHref()} className="text-sm">
            Generate
          </Link>
        </nav>
      </div>
    </header>

    <main className="px-md py-xl max-w-page mx-auto w-full flex-1">
      {children}
    </main>

    <footer className="border-border text-content-muted px-md py-md border-t text-center text-sm">
      {appConfig.description}
    </footer>
  </div>
);
