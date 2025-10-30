-- Replace function to explicitly bypass RLS using security-safe subqueries
CREATE OR REPLACE FUNCTION check_can_insert_submission_for_activity(
  p_user_id UUID,
  p_activity_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_has_membership BOOLEAN;
BEGIN
  -- Get workspace ID from Activity->Challenge (bypasses RLS due to SECURITY DEFINER)
  -- Note: We query with NO RLS check by using the function's elevated privileges
  SELECT c."workspaceId" INTO v_workspace_id
  FROM "Activity" a
  JOIN "Challenge" c ON c.id = a."challengeId"
  WHERE a.id = p_activity_id;

  -- If activity doesn't exist, return FALSE
  IF v_workspace_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has membership in that workspace (bypasses RLS due to SECURITY DEFINER)
  SELECT EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "workspaceId" = v_workspace_id
    AND "userId" = p_user_id
  ) INTO v_has_membership;

  RETURN v_has_membership;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION check_can_insert_submission_for_activity(UUID, UUID) TO authenticated;
