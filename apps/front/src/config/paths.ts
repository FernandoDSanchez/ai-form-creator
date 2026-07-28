/**
 * Única fuente de verdad de las rutas de la app.
 * Nunca escribas una ruta literal en un componente: usa `paths.x.getHref()`.
 * (ESLint bloquea `<Link to="/algo">` mediante `no-restricted-syntax`.)
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

  notFound: {
    path: '*',
    getHref: () => '/404',
  },
} as const;
