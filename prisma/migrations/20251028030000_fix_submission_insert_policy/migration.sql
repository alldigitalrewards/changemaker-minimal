-- =============================================================================
-- Fix ActivitySubmission INSERT Policy
-- Migration: 20251028030000_fix_submission_insert_policy
-- =============================================================================
-- Issue: Test #14 "participant can create own submission" fails with RLS violation
--
-- Root Cause: The submission_participant_insert policy WITH CHECK clause
-- references "ActivitySubmission"."activityId" which doesn't work correctly
-- for INSERT operations. Need to reference the column directly.
--
-- Solution: Update WITH CHECK clause to reference column without table prefix
-- =============================================================================

-- Drop the incorrect INSERT policy
DROP POLICY IF EXISTS "submission_participant_insert" ON "ActivitySubmission";

-- Create corrected INSERT policy
-- Participants can insert submissions for activities in their workspace
CREATE POLICY "submission_participant_insert"
ON "ActivitySubmission"
FOR INSERT
WITH CHECK (
  "userId" = current_user_id()
  AND EXISTS (
    SELECT 1 FROM "Activity" a
    JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE a.id = "activityId"  -- Reference NEW row's activityId directly
    AND user_can_access_workspace(c."workspaceId")
  )
);

-- Verify policy is created correctly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ActivitySubmission'
    AND policyname = 'submission_participant_insert'
  ) THEN
    RAISE EXCEPTION 'Failed to create submission_participant_insert policy';
  END IF;

  RAISE NOTICE 'ActivitySubmission INSERT policy fix complete';
END $$;
