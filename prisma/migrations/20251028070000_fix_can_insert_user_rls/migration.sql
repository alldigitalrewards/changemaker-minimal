-- =============================================================================
-- Fix can_insert_submission to bypass User table RLS
-- Migration: 20251028070000_fix_can_insert_user_rls
-- =============================================================================
-- Issue: SECURITY DEFINER function cannot query User table because User's
-- SELECT RLS policy only allows "supabaseUserId" = auth.uid(), which blocks
-- looking up other users' records.
--
-- Solution: Since SECURITY DEFINER runs as postgres, we need to ensure the
-- User table query works. The function validates that p_user_id matches
-- auth.uid() by checking the User's supabaseUserId, but it can't read that
-- due to RLS.
--
-- Fix: Change the validation logic - instead of looking up supabaseUserId
-- from p_user_id, we look up the database user ID from auth.uid() and
-- compare it to p_user_id.
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
  -- Get the database user ID for the authenticated user
  -- This query will work because it's checking auth.uid() which matches the RLS policy
  SELECT id INTO v_current_user_id
  FROM "User"
  WHERE "supabaseUserId" = auth.uid();

  -- User must exist and must match the userId in the submission
  IF v_current_user_id IS NULL OR v_current_user_id != p_user_id THEN
    RETURN FALSE;
  END IF;

  -- Get challenge and workspace from activity (bypasses RLS with SECURITY DEFINER)
  SELECT c."workspaceId", c.id INTO v_workspace_id, v_challenge_id
  FROM "Activity" a
  JOIN "Challenge" c ON c.id = a."challengeId"
  WHERE a.id = p_activity_id;

  IF v_workspace_id IS NULL OR v_challenge_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has workspace membership (bypasses RLS with SECURITY DEFINER)
  IF NOT EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "userId" = v_current_user_id
    AND "workspaceId" = v_workspace_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if user has enrollment for this challenge (bypasses RLS with SECURITY DEFINER)
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
  RAISE NOTICE 'can_insert_submission() updated to bypass User table RLS by querying with auth.uid()';
END $$;
