-- Add platformSuperAdmin column to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "platformSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster lookups of super admins
CREATE INDEX IF NOT EXISTS "User_platformSuperAdmin_idx" ON "User"("platformSuperAdmin") WHERE "platformSuperAdmin" = true;

-- Update existing users who have platform_super_admin in permissions array
UPDATE "User"
SET "platformSuperAdmin" = true
WHERE 'platform_super_admin' = ANY(permissions);
