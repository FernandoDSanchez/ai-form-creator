import { delay, http, HttpResponse } from 'msw';

import { MOCK_API_LATENCY_MS } from '@/config/server-config';
import { dynamicFormEndpoints } from '@/features/dynamic-form/config/api-endpoints';

import { formTemplatesDb } from '../data/form-templates';

const apiPath = (path: string) => `*${path}`;

export const formTemplatesHandlers = [
  http.get(apiPath(dynamicFormEndpoints.formTemplates), async () => {
    await delay(MOCK_API_LATENCY_MS);

    return HttpResponse.json(
      formTemplatesDb.map(({ schema: _schema, ...summary }) => summary),
    );
  }),

  http.get(
    apiPath(dynamicFormEndpoints.formTemplate(':formTemplateId')),
    async ({ params }) => {
      await delay(MOCK_API_LATENCY_MS);

      const formTemplate = formTemplatesDb.find(
        (template) => template.id === params.formTemplateId,
      );

      if (!formTemplate) {
        return HttpResponse.json(
          { message: 'Form not found' },
          { status: 404 },
        );
      }

      return HttpResponse.json(formTemplate);
    },
  ),

  http.post(
    apiPath(dynamicFormEndpoints.formResponses(':formTemplateId')),
    async ({ params, request }) => {
      await delay(MOCK_API_LATENCY_MS);

      const values = await request.json();

      return HttpResponse.json(
        {
          id: crypto.randomUUID(),
          formTemplateId: params.formTemplateId,
          values,
          createdAt: new Date().toISOString(),
        },
        { status: 201 },
      );
    },
  ),
];
