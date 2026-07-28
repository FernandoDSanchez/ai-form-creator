import { z } from 'zod';

/**
 * RAGFlow es un servicio externo: lo que llega se valida antes de creerle.
 * Sólo se declaran los campos que consumimos — el resto pasa de largo.
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
