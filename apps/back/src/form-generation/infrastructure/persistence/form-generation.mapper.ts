import type { FormilyFormSchema } from '@ai-form-creator/contracts/form-generation/formily-form-schema';
import type { GeneratedForm } from '@ai-form-creator/contracts/form-generation/generated-form';
import type { FormGeneration as FormGenerationRow } from '@prisma/client';

import type { FormGeneration } from '../../domain/form-generation';

/**
 * Postgres row → domain entity.
 *
 * It is the only place where `DateTime` becomes an ISO 8601 string and where
 * Prisma's `JsonValue` becomes the contract type.
 *
 * That second jump is an assertion, and it is worth keeping in plain sight:
 * Prisma types `Json` columns as `JsonValue` because it cannot know what is
 * inside, and TypeScript has nothing to verify it with. The guarantee does not
 * come from here — it comes from the only writer of those columns being the
 * worker, and doing it after passing `Value.Check` against the very schema this
 * type comes from. If anything else ever wrote those columns, this `as` becomes
 * a lie and validation on read is required.
 */
export const toFormGeneration = (row: FormGenerationRow): FormGeneration => ({
  id: row.id,
  prompt: row.prompt,
  regulatoryDocumentIds: row.regulatoryDocumentIds,
  // Prisma's enum and `formGenerationStatuses` share their literals, so
  // TypeScript accepts the direct assignment. If they diverged, the error would
  // surface here — which is exactly where we want to find out.
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
