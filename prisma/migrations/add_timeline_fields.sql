-- Add timeline fields with default values for existing records
ALTER TABLE "Challenge" 
ADD COLUMN "startDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "endDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
ADD COLUMN "enrollmentDeadline" TIMESTAMP(3);

-- Update existing records with sensible defaults
UPDATE "Challenge" 
SET "startDate" = CURRENT_TIMESTAMP,
    "endDate" = CURRENT_TIMESTAMP + INTERVAL '30 days',
    "enrollmentDeadline" = CURRENT_TIMESTAMP
WHERE "startDate" IS NULL;

-- Now make the required fields NOT NULL
ALTER TABLE "Challenge" 
ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "endDate" SET NOT NULL;

-- Remove the defaults (we don't want them for new records)
ALTER TABLE "Challenge" 
ALTER COLUMN "startDate" DROP DEFAULT,
ALTER COLUMN "endDate" DROP DEFAULT;

-- Add index for performance
CREATE INDEX "Challenge_workspaceId_startDate_idx" ON "Challenge"("workspaceId", "startDate");