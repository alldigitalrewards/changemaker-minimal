-- Add createdAt column to RewardIssuance table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'RewardIssuance'
    AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "RewardIssuance"
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Add rewardStackTransactionId if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'RewardIssuance' 
    AND column_name = 'rewardStackTransactionId'
  ) THEN
    ALTER TABLE "RewardIssuance" 
    ADD COLUMN "rewardStackTransactionId" TEXT UNIQUE;
  END IF;
END $$;

-- Add rewardStackOrderId if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'RewardIssuance' 
    AND column_name = 'rewardStackOrderId'
  ) THEN
    ALTER TABLE "RewardIssuance" 
    ADD COLUMN "rewardStackOrderId" TEXT;
  END IF;
END $$;

-- Add rewardStackWebhookReceived if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'RewardIssuance' 
    AND column_name = 'rewardStackWebhookReceived'
  ) THEN
    ALTER TABLE "RewardIssuance" 
    ADD COLUMN "rewardStackWebhookReceived" TIMESTAMP(3);
  END IF;
END $$;
