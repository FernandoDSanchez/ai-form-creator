import { z } from 'zod';

/**
 * RAGFlow is an external service: what arrives is validated before being
 * believed. Only the fields we consume are declared — the rest goes straight
 * through.
 */
export const ragflowUploadResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: z
    .array(
      z.object({
        id: z.string().min(1),
        dataset_id: z.string().min(1),
        name: z.string().optional(),
      }),
    )
    .optional(),
});

export type RagflowUploadResponse = z.infer<typeof ragflowUploadResponseSchema>;
