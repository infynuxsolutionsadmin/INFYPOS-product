-- AlterTable: Add idempotency_key and request_hash to sales table
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(100);
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "request_hash" VARCHAR(64);

-- CreateIndex: Tenant-scoped uniqueness constraint on idempotency_key
CREATE UNIQUE INDEX IF NOT EXISTS "sales_tenant_id_idempotency_key_key" ON "sales"("tenant_id", "idempotency_key");

-- CreateIndex: Performance lookup index on idempotency_key
CREATE INDEX IF NOT EXISTS "sales_idempotency_key_idx" ON "sales"("idempotency_key");
