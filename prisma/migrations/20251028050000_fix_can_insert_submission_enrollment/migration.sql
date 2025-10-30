-- =============================================================================
-- Fix can_insert_submission to Check Enrollment
-- Migration: 20251028050000_fix_can_insert_submission_enrollment
-- =============================================================================
-- Issue: can_insert_submission returns true but INSERT still fails with RLS error
--
-- Root Cause: The function doesn't validate that user has an enrollment
-- for the challenge, which is required to submit activities.
--
-- Solution: Update function to check for valid enrollment
-- =============================================================================

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
  v_challenge_id UUID;
BEGIN
  -- Get current user's database ID
  SELECT id INTO v_current_user_id
  FROM "User"
  WHERE "supabaseUserId" = auth.uid();

  -- User must be the one creating the submission
  IF v_current_user_id IS NULL OR v_current_user_id != p_user_id THEN
    RETURN FALSE;
  END IF;

  -- Get challenge and workspace from activity (bypasses RLS)
  SELECT c."workspaceId", c.id INTO v_workspace_id, v_challenge_id
  FROM "Activity" a
  JOIN "Challenge" c ON c.id = a."challengeId"
  WHERE a.id = p_activity_id;

  IF v_workspace_id IS NULL OR v_challenge_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has workspace membership
  IF NOT EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "userId" = v_current_user_id
    AND "workspaceId" = v_workspace_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if user has enrollment for this challenge
  IF NOT EXISTS (
    SELECT 1 FROM "Enrollment"
    WHERE "userId" = v_current_user_id
    AND "challengeId" = v_challenge_id
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Verify function is updated
DO $$
BEGIN
  RAISE NOTICE 'can_insert_submission() updated to include enrollment check';
END $$;
