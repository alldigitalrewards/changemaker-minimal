-- Drop old function-based policy
DROP POLICY IF EXISTS "submission_participant_insert" ON "ActivitySubmission";

-- Create new inline policy that doesn't use helper functions
CREATE POLICY "submission_participant_insert"
ON "ActivitySubmission"
FOR INSERT
WITH CHECK (
  "userId" = current_user_id()
  AND EXISTS (
    SELECT 1 FROM "Activity" a
    JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE a.id = "ActivitySubmission"."activityId"
    AND user_can_access_workspace(c."workspaceId")
  )
);
