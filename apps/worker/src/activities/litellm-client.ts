import { generatedFormSchema } from '@ai-form-creator/contracts/form-generation/generated-form';
import { z } from 'zod';

import { llmConfig } from '../config/app-config';
import { env } from '../config/env';
import {
  buildSystemPrompt,
  buildUserPrompt,
  type UserPromptInput,
} from '../domain/build-generation-prompt';
import { toStrictJsonSchema } from '../domain/to-strict-json-schema';

/**
 * LiteLLM client.
 *
 * LiteLLM exposes the OpenAI API and translates back to the real provider, so
 * here we speak `chat/completions` without knowing whether Gemini, Claude or
 * GPT is on the other side. Switching models is changing `LITELLM_MODEL`.
 *
 * Native `fetch`, no SDK: it is a single call and the OpenAI SDK would bring
 * its own retry layer, which here competes with Temporal's.
 */

const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';

/** Schema name in the `response_format`. Only the provider sees it. */
const RESPONSE_SCHEMA_NAME = 'generated_form';

const chatRoles = {
  system: 'system',
  user: 'user',
} as const;

/**
 * The minimum we need from the response. It is deliberately not validated in
 * full: every provider adds fields of its own, and a strict schema here would
 * break with the first provider returning something extra.
 */
const completionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
        finish_reason: z.string().nullish(),
      }),
    )
    .min(1),
});

export class FormDraftRequestFailedError extends Error {
  constructor(reason: string, options?: { cause?: unknown }) {
    super(`Could not get the form from the model: ${reason}`, {
      cause: options?.cause,
    });
    this.name = 'FormDraftRequestFailedError';
  }
}

/**
 * The schema travelling in `response_format`, projected exactly once.
 *
 * At module level and not per call: it is the same object on every attempt and
 * walking 32 constants per request contributes nothing.
 */
const responseSchema = toStrictJsonSchema(generatedFormSchema);

/** Asks for the draft and returns the raw content. Validating it is somebody else's job. */
export const requestFormDraft = async (
  input: UserPromptInput,
): Promise<string> => {
  const response = await post({
    model: env.LITELLM_MODEL,
    temperature: llmConfig.temperature,
    messages: [
      { role: chatRoles.system, content: buildSystemPrompt() },
      { role: chatRoles.user, content: buildUserPrompt(input) },
    ],
    // Structured output: the provider takes care of the answer having this
    // shape. It is not trusted — it is validated afterwards anyway — but it
    // moves the bulk of the work to whoever can do it with constrained
    // decoding, instead of to a retry loop.
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: RESPONSE_SCHEMA_NAME,
        strict: true,
        schema: responseSchema,
      },
    },
  });

  const parsed = completionResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new FormDraftRequestFailedError(
      'the LiteLLM response does not have the expected shape',
      { cause: parsed.error },
    );
  }

  const [choice] = parsed.data.choices;
  const content = choice?.message.content;

  if (!content) {
    // This happens when the model stops on a token limit or a content filter:
    // the answer arrives with a 200 and empty content.
    throw new FormDraftRequestFailedError(
      `the model returned no content (finish_reason: ${choice?.finish_reason ?? 'unknown'})`,
    );
  }

  return content;
};

const post = async (body: unknown): Promise<Response> => {
  const url = `${env.LITELLM_BASE_URL}${CHAT_COMPLETIONS_PATH}`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.LITELLM_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(llmConfig.timeoutMs),
    });
  } catch (cause) {
    const reason =
      cause instanceof Error && cause.name === 'TimeoutError'
        ? `it did not answer within ${llmConfig.timeoutMs} ms`
        : 'the service could not be reached';

    throw new FormDraftRequestFailedError(reason, { cause });
  }

  if (!response.ok) {
    // The LiteLLM error body says what the real problem is (unauthorised model,
    // expired key, exhausted budget). Without it, the log shows a bare 400 and
    // there is nowhere to start.
    const detail = await response.text().catch(() => '');

    throw new FormDraftRequestFailedError(
      `LiteLLM answered HTTP ${response.status} ${detail.slice(0, ERROR_DETAIL_MAX_LENGTH)}`.trim(),
    );
  }

  return response;
};

const ERROR_DETAIL_MAX_LENGTH = 500;
