import type { FormilyFormSchema } from '@ai-form-creator/contracts/form-generation/formily-form-schema';
import type { GeneratedForm } from '@ai-form-creator/contracts/form-generation/generated-form';
import type { FormGeneration as FormGenerationRow } from '@prisma/client';

import type { FormGeneration } from '../../domain/form-generation';

/**
 * Fila de Postgres → entidad de dominio.
 *
 * Es el único punto donde `DateTime` se vuelve string ISO 8601 y donde el
 * `JsonValue` de Prisma se vuelve el tipo del contrato.
 *
 * Ese segundo salto es una aserción, y conviene tenerlo a la vista: Prisma tipa
 * las columnas `Json` como `JsonValue` porque no puede saber qué hay adentro, y
 * TypeScript no tiene con qué verificarlo. La garantía no viene de acá — viene
 * de que lo único que escribe esas columnas es el worker, y lo hace después de
 * pasar el `Value.Check` contra el mismo schema del que sale este tipo. Si
 * alguna vez otra cosa escribiera esas columnas, este `as` pasa a ser una
 * mentira y hay que validar al leer.
 */
export const toFormGeneration = (row: FormGenerationRow): FormGeneration => ({
  id: row.id,
  prompt: row.prompt,
  regulatoryDocumentIds: row.regulatoryDocumentIds,
  // El enum de Prisma y `formGenerationStatuses` comparten literales, así que
  // TypeScript acepta la asignación directa. Si divergieran, el error saltaría
  // acá — que es justamente donde queremos enterarnos.
  status: row.status,
  attempts: row.attempts,
  draft: (row.draft as GeneratedForm | null) ?? null,
  formilySchema: (row.formilySchema as FormilyFormSchema | null) ?? null,
  failureReason: row.failureReason,
  reviewerNote: row.reviewerNote,
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
