-- =============================================================================
-- Add can_insert_submission Helper Function
-- Migration: 20251028040000_add_can_insert_submission_function
-- =============================================================================
-- Issue: ActivitySubmission INSERT policy WITH CHECK clause doesn't work
-- properly when referencing the table being inserted into.
--
-- Solution: Create SECURITY DEFINER function to validate submission insert
-- permissions based on activity ID, similar to can_access_submission.
-- =============================================================================

-- Create helper function to check if user can insert submission for activity
CREATE OR REPLACE FUNCTION can_insert_submission(
  p_user_id UUID,
  p_activity_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_workspace_id UUID;
BEGIN
  -- Get current user's database ID
  SELECT id INTO v_current_user_id
  FROM "User"
  WHERE "supabaseUserId" = auth.uid();

  -- User must be the one creating the submission
  IF v_current_user_id IS NULL OR v_current_user_id != p_user_id THEN
    RETURN FALSE;
  END IF;

  -- Check if activity exists and user has workspace access (bypasses RLS)
  SELECT c."workspaceId" INTO v_workspace_id
  FROM "Activity" a
  JOIN "Challenge" c ON c.id = a."challengeId"
  WHERE a.id = p_activity_id;

  IF v_workspace_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has access to the workspace
  RETURN EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "userId" = v_current_user_id
    AND "workspaceId" = v_workspace_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION can_insert_submission(UUID, UUID) TO authenticated;

-- Drop and recreate the INSERT policy using the new function
DROP POLICY IF EXISTS "submission_participant_insert" ON "ActivitySubmission";

CREATE POLICY "submission_participant_insert"
ON "ActivitySubmission"
FOR INSERT
WITH CHECK (can_insert_submission("userId", "activityId"));

-- Verify policy and function are created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'can_insert_submission'
  ) THEN
    RAISE EXCEPTION 'Failed to create can_insert_submission function';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ActivitySubmission'
    AND policyname = 'submission_participant_insert'
  ) THEN
    RAISE EXCEPTION 'Failed to create submission_participant_insert policy';
  END IF;

  RAISE NOTICE 'ActivitySubmission INSERT policy with can_insert_submission() function complete';
END $$;
