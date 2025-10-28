-- =============================================================================
-- Fix can_insert_submission to properly validate auth context
-- Migration: 20251028060000_fix_can_insert_submission_auth
-- =============================================================================
-- Issue: Function fails because it tries to match auth.uid() against database
-- user ID instead of supabaseUserId
--
-- Solution: Update function to properly validate that the authenticated user
-- matches the user creating the submission
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
  v_workspace_id UUID;
  v_challenge_id UUID;
  v_supabase_user_id UUID;
BEGIN
  -- Get the supabaseUserId for the user creating the submission
  SELECT "supabaseUserId" INTO v_supabase_user_id
  FROM "User"
  WHERE id = p_user_id;

  -- User must exist and their supabaseUserId must match the authenticated user
  IF v_supabase_user_id IS NULL OR v_supabase_user_id != auth.uid() THEN
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
    WHERE "userId" = p_user_id
    AND "workspaceId" = v_workspace_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if user has enrollment for this challenge
  IF NOT EXISTS (
    SELECT 1 FROM "Enrollment"
    WHERE "userId" = p_user_id
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
  RAISE NOTICE 'can_insert_submission() updated to properly validate auth context';
END $$;
