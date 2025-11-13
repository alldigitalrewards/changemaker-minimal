-- Create NotificationType enum
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'SHIPPING_ADDRESS_REQUIRED',
    'CHALLENGE_INVITED',
    'CHALLENGE_ENROLLED',
    'REWARD_ISSUED',
    'SUBMISSION_APPROVED',
    'SUBMISSION_REJECTED',
    'ANNOUNCEMENT',
    'SYSTEM'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Notification table
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actionUrl" TEXT,
  "actionText" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP,
  "dismissed" BOOLEAN NOT NULL DEFAULT false,
  "dismissedAt" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId")
    REFERENCES "Workspace"("id") ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "Notification_userId_read_dismissed_idx"
  ON "Notification"("userId", "read", "dismissed");

CREATE INDEX IF NOT EXISTS "Notification_workspaceId_idx"
  ON "Notification"("workspaceId");

CREATE INDEX IF NOT EXISTS "Notification_type_idx"
  ON "Notification"("type");

CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx"
  ON "Notification"("createdAt");

CREATE INDEX IF NOT EXISTS "Notification_expiresAt_idx"
  ON "Notification"("expiresAt");

-- Enable RLS
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
  ON "Notification" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User"."id" = "Notification"."userId"
      AND "User"."supabaseUserId" = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications"
  ON "Notification" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User"."id" = "Notification"."userId"
      AND "User"."supabaseUserId" = auth.uid()
    )
  );

-- System can insert notifications (for server-side operations)
CREATE POLICY "Service role can insert notifications"
  ON "Notification" FOR INSERT
  WITH CHECK (true);
