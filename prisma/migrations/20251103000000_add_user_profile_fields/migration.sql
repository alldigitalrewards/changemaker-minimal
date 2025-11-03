-- AlterTable: Add comprehensive user profile fields for CRM and reward fulfillment
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressLine1" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "zipCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "department" TEXT;

-- Backfill displayName from email for existing users
-- This extracts the username part before the @ symbol as a temporary display name
UPDATE "User"
SET "displayName" = SPLIT_PART(email, '@', 1)
WHERE "displayName" IS NULL AND email IS NOT NULL;
