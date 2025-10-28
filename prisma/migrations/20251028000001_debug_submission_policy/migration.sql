-- Debug function to test the submission_participant_insert policy condition
CREATE OR REPLACE FUNCTION debug_can_insert_submission(
  p_user_id UUID,
  p_activity_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    p_user_id = current_user_id()
    AND EXISTS (
      SELECT 1 FROM "Activity" a
      JOIN "Challenge" c ON c.id = a."challengeId"
      WHERE a.id = p_activity_id
      AND user_can_access_workspace(c."workspaceId")
    )
  );
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION debug_can_insert_submission(UUID, UUID) TO authenticated;
