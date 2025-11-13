-- AlterTable
ALTER TABLE "User" ADD COLUMN "platformSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Update existing platform super admins
UPDATE "User"
SET "platformSuperAdmin" = true
WHERE email IN ('jfelke@alldigitalrewards.com', 'krobinson@alldigitalrewards.com');
