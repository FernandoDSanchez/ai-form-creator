import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo, type ComponentType } from 'react';
import {
  createBrowserRouter,
  type ActionFunction,
  type LoaderFunction,
} from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { paths } from '@/config/paths';

type RouteModule = {
  default: ComponentType;
  clientLoader?: (queryClient: QueryClient) => LoaderFunction;
  clientAction?: (queryClient: QueryClient) => ActionFunction;
};

/**
 * Turns a route module into the shape react-router expects, injecting the
 * `queryClient` into loaders/actions.
 */
const convert = (queryClient: QueryClient) => (routeModule: RouteModule) => ({
  loader: routeModule.clientLoader?.(queryClient),
  action: routeModule.clientAction?.(queryClient),
  Component: routeModule.default,
});

export const createAppRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    {
      path: paths.home.path,
      lazy: () => import('./routes/landing').then(convert(queryClient)),
    },
    {
      path: paths.forms.root.path,
      lazy: () => import('./routes/forms/forms').then(convert(queryClient)),
    },
    {
      path: paths.forms.detail.path,
      lazy: () => import('./routes/forms/form').then(convert(queryClient)),
    },
    {
      path: paths.regulatoryDocuments.root.path,
      lazy: () =>
        import('./routes/regulatory-documents').then(convert(queryClient)),
    },
    {
      path: paths.formGenerations.root.path,
      lazy: () =>
        import('./routes/form-generations/form-generations').then(
          convert(queryClient),
        ),
    },
    {
      path: paths.formGenerations.detail.path,
      lazy: () =>
        import('./routes/form-generations/form-generation').then(
          convert(queryClient),
        ),
    },
    {
      path: paths.notFound.path,
      lazy: () => import('./routes/not-found').then(convert(queryClient)),
    },
  ]);

export const AppRouter = () => {
  const queryClient = useQueryClient();
  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);

  return <RouterProvider router={router} />;
};
