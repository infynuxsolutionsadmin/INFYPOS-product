-- AlterTable: Add Stripe and Subscription Billing fields to tenants
ALTER TABLE "tenants" 
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "subscription_plan" VARCHAR(50) DEFAULT 'FREE_TRIAL',
  ADD COLUMN IF NOT EXISTS "subscription_status" VARCHAR(50) DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS "billing_cycle" VARCHAR(20) DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "current_period_end" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_stripe_customer_id_key" ON "tenants"("stripe_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_stripe_subscription_id_key" ON "tenants"("stripe_subscription_id");

-- CreateTable: billing_invoices
CREATE TABLE IF NOT EXISTS "billing_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "stripe_invoice_id" VARCHAR(255) NOT NULL,
    "amount_due" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'gbp',
    "status" VARCHAR(50) NOT NULL,
    "hosted_invoice_url" TEXT,
    "invoice_pdf" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "billing_invoices_stripe_invoice_id_key" UNIQUE ("stripe_invoice_id"),
    CONSTRAINT "billing_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "billing_invoices_tenant_id_idx" ON "billing_invoices"("tenant_id");

