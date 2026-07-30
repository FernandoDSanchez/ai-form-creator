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
 * Cliente de LiteLLM.
 *
 * LiteLLM expone la API de OpenAI y traduce hacia atrás al proveedor real, así
 * que acá se habla `chat/completions` sin saber si del otro lado hay Gemini,
 * Claude o GPT. Cambiar de modelo es cambiar `LITELLM_MODEL`.
 *
 * `fetch` nativo, sin SDK: es una sola llamada y el SDK de OpenAI traería su
 * propia capa de reintentos, que acá compite con la de Temporal.
 */

const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';

/** Nombre del schema en el `response_format`. Sólo lo ve el proveedor. */
const RESPONSE_SCHEMA_NAME = 'generated_form';

const chatRoles = {
  system: 'system',
  user: 'user',
} as const;

/**
 * Lo mínimo que necesitamos de la respuesta. No se valida entera a propósito:
 * cada proveedor agrega campos suyos, y un schema estricto acá rompería con el
 * primer proveedor que devuelva algo de más.
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
    super(`No se pudo obtener el formulario del modelo: ${reason}`, {
      cause: options?.cause,
    });
    this.name = 'FormDraftRequestFailedError';
  }
}

/**
 * El schema que viaja en `response_format`, proyectado una sola vez.
 *
 * A nivel de módulo y no por llamada: es el mismo objeto en cada intento y
 * recorrer 32 constantes por request no aporta nada.
 */
const responseSchema = toStrictJsonSchema(generatedFormSchema);

/** Pide el borrador y devuelve el contenido crudo. Validarlo es de otro. */
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
    // Structured output: el proveedor se encarga de que la respuesta tenga
    // esta forma. No se confía en eso —igual se valida después— pero mueve el
    // grueso del trabajo al que puede hacerlo con constrained decoding, en vez
    // de a un bucle de reintentos.
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
      'la respuesta de LiteLLM no tiene la forma esperada',
      { cause: parsed.error },
    );
  }

  const [choice] = parsed.data.choices;
  const content = choice?.message.content;

  if (!content) {
    // Pasa cuando el modelo corta por límite de tokens o por filtro de
    // contenido: la respuesta llega con 200 y el contenido vacío.
    throw new FormDraftRequestFailedError(
      `el modelo no devolvió contenido (finish_reason: ${choice?.finish_reason ?? 'desconocido'})`,
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
        ? `no respondió en ${llmConfig.timeoutMs} ms`
        : 'no se pudo contactar el servicio';

    throw new FormDraftRequestFailedError(reason, { cause });
  }

  if (!response.ok) {
    // El cuerpo del error de LiteLLM dice cuál es el problema real (modelo no
    // autorizado, key vencida, presupuesto agotado). Sin él, el log muestra un
    // 400 pelado y no hay por dónde empezar.
    const detail = await response.text().catch(() => '');

    throw new FormDraftRequestFailedError(
      `LiteLLM respondió HTTP ${response.status} ${detail.slice(0, ERROR_DETAIL_MAX_LENGTH)}`.trim(),
    );
  }

  return response;
};

const ERROR_DETAIL_MAX_LENGTH = 500;
