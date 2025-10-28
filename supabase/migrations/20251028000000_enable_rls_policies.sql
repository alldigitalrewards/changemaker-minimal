-- Fix missing default value for ActivitySubmission.id
-- This is needed because Prisma schema has @id but no @default(uuid())
ALTER TABLE "ActivitySubmission" ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Enable RLS on all tables
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Challenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChallengeAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivitySubmission" ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's internal ID from supabaseUserId
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_id() TO anon;

-- Helper function to check workspace access
CREATE OR REPLACE FUNCTION user_can_access_workspace(workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "WorkspaceMembership"
    WHERE "userId" = current_user_id()
      AND "workspaceId" = workspace_id
  )
$$;

GRANT EXECUTE ON FUNCTION user_can_access_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_access_workspace(uuid) TO anon;

-- Helper function to get user's role in workspace
CREATE OR REPLACE FUNCTION get_user_workspace_role(workspace_id uuid)
RETURNS "Role"
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role
  FROM "WorkspaceMembership"
  WHERE "userId" = current_user_id()
    AND "workspaceId" = workspace_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION get_user_workspace_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_workspace_role(uuid) TO anon;

-- Helper function to check if user can insert submission
CREATE OR REPLACE FUNCTION can_insert_submission(p_user_id uuid, p_activity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_workspace_id uuid;
  v_user_has_membership boolean;
  v_challenge_id uuid;
  v_has_enrollment boolean;
BEGIN
  -- Get the challenge's workspace via Activity
  SELECT a."challengeId", c."workspaceId"
  INTO v_challenge_id, v_workspace_id
  FROM "Activity" a
  INNER JOIN "Challenge" c ON c.id = a."challengeId"
  WHERE a.id = p_activity_id;

  IF v_workspace_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check workspace membership (bypasses User table RLS)
  SELECT EXISTS (
    SELECT 1
    FROM "WorkspaceMembership"
    WHERE "userId" = p_user_id
      AND "workspaceId" = v_workspace_id
  ) INTO v_user_has_membership;

  IF NOT v_user_has_membership THEN
    RETURN FALSE;
  END IF;

  -- Check enrollment
  SELECT EXISTS (
    SELECT 1
    FROM "Enrollment"
    WHERE "userId" = p_user_id
      AND "challengeId" = v_challenge_id
  ) INTO v_has_enrollment;

  RETURN v_has_enrollment;
END;
$$;

GRANT EXECUTE ON FUNCTION can_insert_submission(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_insert_submission(uuid, uuid) TO anon;

-- Workspace Policies
CREATE POLICY "workspace_select"
ON "Workspace"
FOR SELECT
TO authenticated
USING (user_can_access_workspace(id));

-- User Policies
CREATE POLICY "user_select"
ON "User"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "WorkspaceMembership" wm1
    INNER JOIN "WorkspaceMembership" wm2 ON wm1."workspaceId" = wm2."workspaceId"
    WHERE wm1."userId" = current_user_id()
      AND wm2."userId" = "User".id
  )
);

-- WorkspaceMembership Policies
CREATE POLICY "membership_select"
ON "WorkspaceMembership"
FOR SELECT
TO authenticated
USING (user_can_access_workspace("workspaceId"));

-- Challenge Policies
CREATE POLICY "challenge_select"
ON "Challenge"
FOR SELECT
TO authenticated
USING (user_can_access_workspace("workspaceId"));

-- ChallengeAssignment Policies
CREATE POLICY "assignment_select"
ON "ChallengeAssignment"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "Challenge" c
    WHERE c.id = "ChallengeAssignment"."challengeId"
      AND user_can_access_workspace(c."workspaceId")
  )
);

CREATE POLICY "assignment_insert"
ON "ChallengeAssignment"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "Challenge" c
    WHERE c.id = "challengeId"
      AND user_can_access_workspace(c."workspaceId")
      AND get_user_workspace_role(c."workspaceId") = 'ADMIN'
  )
);

CREATE POLICY "assignment_delete"
ON "ChallengeAssignment"
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "Challenge" c
    WHERE c.id = "challengeId"
      AND user_can_access_workspace(c."workspaceId")
      AND get_user_workspace_role(c."workspaceId") = 'ADMIN'
  )
);

-- Enrollment Policies
CREATE POLICY "enrollment_select"
ON "Enrollment"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "Challenge" c
    WHERE c.id = "Enrollment"."challengeId"
      AND user_can_access_workspace(c."workspaceId")
  )
);

-- Activity Policies
CREATE POLICY "activity_select"
ON "Activity"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "Challenge" c
    WHERE c.id = "Activity"."challengeId"
      AND user_can_access_workspace(c."workspaceId")
  )
);

-- ActivitySubmission Policies
CREATE POLICY "submission_select"
ON "ActivitySubmission"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "Activity" a
    INNER JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE a.id = "ActivitySubmission"."activityId"
      AND (
        -- User can see own submissions
        "ActivitySubmission"."userId" = current_user_id()
        OR
        -- Admin can see all submissions in workspace
        get_user_workspace_role(c."workspaceId") = 'ADMIN'
        OR
        -- Manager can see submissions for assigned challenges
        (
          get_user_workspace_role(c."workspaceId") = 'MANAGER'
          AND EXISTS (
            SELECT 1
            FROM "ChallengeAssignment" ca
            WHERE ca."challengeId" = c.id
              AND ca."managerId" = current_user_id()
          )
        )
      )
  )
);

CREATE POLICY "submission_insert"
ON "ActivitySubmission"
FOR INSERT
TO authenticated
WITH CHECK (can_insert_submission("userId", "activityId"));

CREATE POLICY "submission_update"
ON "ActivitySubmission"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "Activity" a
    INNER JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE a.id = "ActivitySubmission"."activityId"
      AND (
        -- Admin can update any submission in workspace
        get_user_workspace_role(c."workspaceId") = 'ADMIN'
        OR
        -- Manager can update submissions for assigned challenges
        (
          get_user_workspace_role(c."workspaceId") = 'MANAGER'
          AND EXISTS (
            SELECT 1
            FROM "ChallengeAssignment" ca
            WHERE ca."challengeId" = c.id
              AND ca."managerId" = current_user_id()
          )
        )
      )
  )
);
