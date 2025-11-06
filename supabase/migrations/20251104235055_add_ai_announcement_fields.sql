-- Add AI-enhanced fields to workspace communications
ALTER TABLE "WorkspaceCommunication"
ADD COLUMN IF NOT EXISTS "tldr" TEXT,
ADD COLUMN IF NOT EXISTS "highlights" JSONB,
ADD COLUMN IF NOT EXISTS "aiDates" JSONB,
ADD COLUMN IF NOT EXISTS "aiActions" JSONB,
ADD COLUMN IF NOT EXISTS "aiPrioritySuggestion" TEXT;
