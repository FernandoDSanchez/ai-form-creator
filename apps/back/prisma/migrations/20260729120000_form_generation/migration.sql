-- CreateEnum
CREATE TYPE "FormGenerationStatus" AS ENUM ('PENDING', 'RETRIEVING', 'GENERATING', 'VALIDATING', 'REPAIRING', 'AWAITING_REVIEW', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "form_generations" (
    "id" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "regulatory_document_ids" UUID[],
    "status" "FormGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "draft" JSONB,
    "formily_schema" JSONB,
    "failure_reason" TEXT,
    "reviewer_note" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "form_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_generations_status_created_at_idx" ON "form_generations"("status", "created_at");

-- ---------------------------------------------------------------------------
-- LISTEN / NOTIFY
-- ---------------------------------------------------------------------------
-- The one moving these statuses is the Temporal worker, which runs in another
-- pod and writes straight into this table. Without this, the back would have no
-- way of finding out other than polling in a loop.
--
-- The notification carries ONLY the id and the status, not the whole row. Two
-- reasons, and the first one is fatal:
--
--   1. The pg_notify payload has a hard cap of 8000 bytes. `formily_schema`
--      goes over it with any medium-sized form, and when it does the `NOTIFY`
--      does not truncate: it aborts the worker transaction with "payload string
--      too long". Which means the trigger that looks most convenient
--      (row_to_json(NEW)) breaks exactly the UPDATE that matters most.
--   2. Even if it fit, it would be a raw Postgres row — snake_case, unserialised
--      `DateTime` — travelling all the way to the front without going through
--      the mapper.
--
-- With the notification, the back re-reads by id with Prisma and emits the real
-- entity.
CREATE OR REPLACE FUNCTION notify_form_generation_changed()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'form_generation_changed',
    json_build_object('id', NEW.id, 'status', NEW.status)::text
  );
  -- AFTER trigger: the return value is ignored.
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Two triggers and not one: the WHEN clause below looks at OLD, which does not
-- exist on an INSERT. Splitting them avoids having to branch on TG_OP inside the
-- function.
CREATE TRIGGER form_generation_inserted
AFTER INSERT ON "form_generations"
FOR EACH ROW EXECUTE FUNCTION notify_form_generation_changed();

-- Only when the status really changes. The worker touches `attempts` and
-- `updated_at` in the same UPDATE as the status, so without the WHEN the front
-- would receive duplicates telling it nothing new.
CREATE TRIGGER form_generation_status_changed
AFTER UPDATE OF "status" ON "form_generations"
FOR EACH ROW
WHEN (OLD."status" IS DISTINCT FROM NEW."status")
EXECUTE FUNCTION notify_form_generation_changed();
