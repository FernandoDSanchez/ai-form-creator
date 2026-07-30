import type {
  FormGenerationReview,
  NewFormGeneration,
} from '@ai-form-creator/contracts/form-generation/form-generation';
import {
  formGenerationReviewDecisions,
  formGenerationStatuses,
} from '@ai-form-creator/contracts/form-generation/form-generation-status';
import { delay, http, HttpResponse } from 'msw';

import { MOCK_API_LATENCY_MS } from '@/config/server-config';
import { formGenerationEndpoints } from '@/features/form-generation/config/api-endpoints';

import {
  advanceFormGeneration,
  createFormGeneration,
  listFormGenerations,
  reviewFormGeneration,
} from '../data/form-generations';

const apiPath = (path: string) => `*${path}`;

/** 202: the back accepts the request and the pipeline continues in the background. */
const ACCEPTED = 202;
const NO_CONTENT = 204;
const NOT_FOUND = 404;

export const formGenerationsHandlers = [
  http.post(
    apiPath(formGenerationEndpoints.formGenerations),
    async ({ request }) => {
      await delay(MOCK_API_LATENCY_MS);

      const body = (await request.json()) as NewFormGeneration;

      return HttpResponse.json(createFormGeneration(body), {
        status: ACCEPTED,
      });
    },
  ),

  http.get(apiPath(formGenerationEndpoints.formGenerations), async () => {
    await delay(MOCK_API_LATENCY_MS);

    return HttpResponse.json(listFormGenerations());
  }),

  http.get(
    apiPath(formGenerationEndpoints.formGeneration(':formGenerationId')),
    async ({ params }) => {
      await delay(MOCK_API_LATENCY_MS);

      // Every read advances one step: it is the clock of the simulated
      // pipeline. See `data/form-generations.ts`.
      const formGeneration = advanceFormGeneration(
        String(params.formGenerationId),
      );

      return formGeneration
        ? HttpResponse.json(formGeneration)
        : new HttpResponse(null, { status: NOT_FOUND });
    },
  ),

  http.post(
    apiPath(formGenerationEndpoints.review(':formGenerationId')),
    async ({ params, request }) => {
      await delay(MOCK_API_LATENCY_MS);

      const body = (await request.json()) as FormGenerationReview;
      const status =
        body.decision === formGenerationReviewDecisions.approve
          ? formGenerationStatuses.approved
          : formGenerationStatuses.rejected;

      const reviewed = reviewFormGeneration(
        String(params.formGenerationId),
        status,
        body.reviewerNote,
      );

      // 204 with no body, same as the back: the final status arrives through
      // the other path (here, the next refetch).
      return reviewed
        ? new HttpResponse(null, { status: NO_CONTENT })
        : new HttpResponse(null, { status: NOT_FOUND });
    },
  ),
];
