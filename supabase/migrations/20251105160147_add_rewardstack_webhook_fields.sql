-- Add RewardSTACK webhook fields to Workspace
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "rewardStackWebhookId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "rewardStackWebhookSecret" TEXT;
