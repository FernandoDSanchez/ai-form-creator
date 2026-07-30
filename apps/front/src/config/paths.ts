/**
 * Single source of truth for the app routes.
 * Never write a literal route in a component: use `paths.x.getHref()`.
 * (ESLint blocks `<Link to="/something">` through `no-restricted-syntax`.)
 */
export const paths = {
  home: {
    path: '/',
    getHref: () => '/',
  },

  forms: {
    root: {
      path: '/forms',
      getHref: () => '/forms',
    },
    detail: {
      path: '/forms/:formTemplateId',
      getHref: (formTemplateId: string) => `/forms/${formTemplateId}`,
    },
    submitted: {
      path: '/forms/:formTemplateId/submitted',
      getHref: (formTemplateId: string) => `/forms/${formTemplateId}/submitted`,
    },
  },

  regulatoryDocuments: {
    root: {
      path: '/regulatory-documents',
      getHref: () => '/regulatory-documents',
    },
  },

  formGenerations: {
    root: {
      path: '/form-generations',
      getHref: () => '/form-generations',
    },
    detail: {
      path: '/form-generations/:formGenerationId',
      getHref: (formGenerationId: string) =>
        `/form-generations/${formGenerationId}`,
    },
  },

  notFound: {
    path: '*',
    getHref: () => '/404',
  },
} as const;
