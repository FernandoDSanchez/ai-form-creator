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
-- Quien mueve estos estados es el worker de Temporal, que corre en otro pod y
-- escribe directo en esta tabla. Sin esto, el back no tendría forma de
-- enterarse salvo consultando en loop.
--
-- La notificación lleva SÓLO el id y el estado, no la fila entera. Dos motivos,
-- y el primero es fatal:
--
--   1. El payload de pg_notify tiene un tope duro de 8000 bytes. `formily_schema`
--      lo pasa con cualquier formulario mediano, y cuando lo pasa el `NOTIFY` no
--      trunca: aborta la transacción del worker con "payload string too long".
--      O sea que el trigger que parece más cómodo (row_to_json(NEW)) rompe
--      justamente el UPDATE que más importa.
--   2. Aunque entrara, sería una fila cruda de Postgres —snake_case, `DateTime`
--      sin serializar— viajando hasta el front sin pasar por el mapper.
--
-- Con el aviso, el back relee por id con Prisma y emite la entidad de verdad.
CREATE OR REPLACE FUNCTION notify_form_generation_changed()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'form_generation_changed',
    json_build_object('id', NEW.id, 'status', NEW.status)::text
  );
  -- AFTER trigger: el valor de retorno se ignora.
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Dos triggers y no uno: la cláusula WHEN de abajo mira OLD, que en un INSERT
-- no existe. Separarlos evita tener que ramificar por TG_OP dentro de la
-- función.
CREATE TRIGGER form_generation_inserted
AFTER INSERT ON "form_generations"
FOR EACH ROW EXECUTE FUNCTION notify_form_generation_changed();

-- Sólo cuando el estado cambia de verdad. El worker toca `attempts` y
-- `updated_at` en el mismo UPDATE que el estado, así que sin el WHEN el front
-- recibiría repetidos que no le dicen nada nuevo.
CREATE TRIGGER form_generation_status_changed
AFTER UPDATE OF "status" ON "form_generations"
FOR EACH ROW
WHEN (OLD."status" IS DISTINCT FROM NEW."status")
EXECUTE FUNCTION notify_form_generation_changed();
