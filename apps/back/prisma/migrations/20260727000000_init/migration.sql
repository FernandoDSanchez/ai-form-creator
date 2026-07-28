-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RegulatoryDocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'INDEXED', 'FAILED');

-- CreateTable
CREATE TABLE "regulatory_documents" (
    "id" UUID NOT NULL,
    "ragflow_document_id" TEXT NOT NULL,
    "ragflow_dataset_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "status" "RegulatoryDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "regulatory_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_documents_ragflow_document_id_key" ON "regulatory_documents"("ragflow_document_id");

-- CreateIndex
CREATE INDEX "regulatory_documents_status_created_at_idx" ON "regulatory_documents"("status", "created_at");

