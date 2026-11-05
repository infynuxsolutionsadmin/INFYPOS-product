-- AlterEnum
ALTER TYPE "StoreStatus" ADD VALUE IF NOT EXISTS 'FROZEN';

-- AlterTable
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "frozen_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_plan_tiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "badge" VARCHAR(50),
    "monthly_price_gbp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "annual_price_gbp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_stores" INTEGER NOT NULL DEFAULT 1,
    "max_users" INTEGER NOT NULL DEFAULT 2,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plan_tiers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscription_plan_tiers_code_key" UNIQUE ("code")
);
