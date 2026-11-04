-- AlterTable: Add register_id to shifts table
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "register_id" VARCHAR(100);

-- CreateIndex: Multi-till shift open status index
CREATE INDEX IF NOT EXISTS "shifts_tenant_id_store_id_register_id_status_idx" ON "shifts"("tenant_id", "store_id", "register_id", "status");

-- AlterTable: Add tenant_id to audit_logs table
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- CreateIndex: Tenant index on audit_logs
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateTable: document_sequences for concurrency-safe monotonic sequence numbering
CREATE TABLE IF NOT EXISTS "document_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "date_prefix" VARCHAR(20) NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique sequence counter per tenant, entity type, and date prefix
CREATE UNIQUE INDEX IF NOT EXISTS "document_sequences_tenant_id_entity_type_date_prefix_key" ON "document_sequences"("tenant_id", "entity_type", "date_prefix");
CREATE INDEX IF NOT EXISTS "document_sequences_tenant_id_entity_type_idx" ON "document_sequences"("tenant_id", "entity_type");

