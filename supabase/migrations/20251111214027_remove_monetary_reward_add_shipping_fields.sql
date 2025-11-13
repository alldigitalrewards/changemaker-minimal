-- Remove 'monetary' from RewardType enum and add shipping fields
-- This migration updates the reward system to only support points and SKU rewards

-- Step 1: Add new columns to WorkspaceSku for shipping requirements
ALTER TABLE "WorkspaceSku"
  ADD COLUMN IF NOT EXISTS "requiresShipping" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "WorkspaceSku"."requiresShipping" IS 'Whether this SKU is a physical product requiring shipping address';

-- Step 2: Add shipping address confirmation fields to RewardIssuance
ALTER TABLE "RewardIssuance"
  ADD COLUMN IF NOT EXISTS "shippingAddressConfirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shippingAddressConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "shippingAddressConfirmationEmailSent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shippingAddressConfirmationEmailSentAt" TIMESTAMP(3);

COMMENT ON COLUMN "RewardIssuance"."shippingAddressConfirmed" IS 'Whether participant has confirmed shipping address for physical SKU';
COMMENT ON COLUMN "RewardIssuance"."shippingAddressConfirmedAt" IS 'When shipping address was confirmed';
COMMENT ON COLUMN "RewardIssuance"."shippingAddressConfirmationEmailSent" IS 'Whether confirmation email was sent';
COMMENT ON COLUMN "RewardIssuance"."shippingAddressConfirmationEmailSentAt" IS 'When confirmation email was sent';

-- Step 3: Remove 'monetary' value from RewardType enum
-- First, check if any existing records use 'monetary' type
DO $$
BEGIN
  -- Update any existing 'monetary' rewards to NULL (should not exist in production)
  UPDATE "Challenge"
    SET "rewardType" = NULL
    WHERE "rewardType" = 'monetary';

  UPDATE "RewardIssuance"
    SET "type" = 'points'
    WHERE "type" = 'monetary';

  -- Note: ActivityTemplate doesn't have rewardType in current schema
  -- but if it did, we'd update it here
END $$;

-- Drop the old enum and recreate without 'monetary'
ALTER TYPE "RewardType" RENAME TO "RewardType_old";

CREATE TYPE "RewardType" AS ENUM ('points', 'sku');

-- Update all columns to use new enum
ALTER TABLE "Challenge"
  ALTER COLUMN "rewardType" TYPE "RewardType" USING "rewardType"::text::"RewardType";

ALTER TABLE "RewardIssuance"
  ALTER COLUMN "type" TYPE "RewardType" USING "type"::text::"RewardType";

ALTER TABLE "Activity"
  ALTER COLUMN "rewardType" TYPE "RewardType" USING "rewardType"::text::"RewardType";

ALTER TABLE "ActivityTemplate"
  ALTER COLUMN "rewardType" TYPE "RewardType" USING "rewardType"::text::"RewardType";

-- Drop the old enum
DROP TYPE "RewardType_old";

-- Step 4: Mark known physical SKUs as requiring shipping
UPDATE "WorkspaceSku"
  SET "requiresShipping" = true
  WHERE "skuId" IN ('APPLEWTCH', 'SKU-SWAG-TEE')
    AND "requiresShipping" = false;

-- Update digital SKUs to explicitly not require shipping
UPDATE "WorkspaceSku"
  SET "requiresShipping" = false
  WHERE "skuId" IN ('CVSEC100', 'CPEC50', 'SKU-GIFT-10', 'SKU-GIFT-25')
    AND "requiresShipping" = true;
