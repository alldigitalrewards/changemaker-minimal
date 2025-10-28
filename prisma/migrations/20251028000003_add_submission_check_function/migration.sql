-- Create a SECURITY DEFINER function to check if a submission can be inserted
-- This bypasses RLS on Activity and Challenge tables for the check
CREATE OR REPLACE FUNCTION check_can_insert_submission_for_activity(
  p_user_id UUID,
  p_activity_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Activity" a
    JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE a.id = p_activity_id
    AND EXISTS (
      SELECT 1 FROM "WorkspaceMembership"
      WHERE "workspaceId" = c."workspaceId"
      AND "userId" = p_user_id
    )
  );
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION check_can_insert_submission_for_activity(UUID, UUID) TO authenticated;

-- Drop and recreate the policy to use the new function
DROP POLICY IF EXISTS "submission_participant_insert" ON "ActivitySubmission";

CREATE POLICY "submission_participant_insert"
ON "ActivitySubmission"
FOR INSERT
WITH CHECK (
  "userId" = current_user_id()
  AND check_can_insert_submission_for_activity("userId", "activityId")
);
