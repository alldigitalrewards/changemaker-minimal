import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess, requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth';
import { 
  WorkspaceApiProps, 
  ChallengeCreateRequest, 
  ChallengeListResponse,
  ChallengeCreateResponse,
  ParticipantsListResponse,
  validateChallengeData,
  ApiError
} from '@/lib/types';
import { 
  getWorkspaceChallenges, 
  createChallenge,
  createChallengeEnrollments,
  getWorkspaceUsers,
  DatabaseError,
  ResourceNotFoundError,
  WorkspaceAccessError,
  getWorkspaceBySlug,
  getUserBySupabaseId
} from '@/lib/db/queries';
import { createClient } from '@/lib/supabase/server';

// Remove the temporary function - will create in separate file

export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ChallengeListResponse | ApiError>> => {
  const { slug } = await context.params;
  const { workspace, user } = await requireWorkspaceAccess(slug);

  // Get challenges with user-specific enrollment data
  const challenges = await getWorkspaceChallenges(workspace.id);
  
  // Filter enrollments to only show current user's enrollment status
  const challengesWithUserEnrollment = challenges.map(challenge => ({
    ...challenge,
    enrollments: challenge.enrollments?.filter(enrollment => 
      enrollment.userId === user.dbUser.id
    ) || []
  }));

  return NextResponse.json({ challenges: challengesWithUserEnrollment });
})

export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ChallengeCreateResponse | ApiError>> => {
  const { slug } = await context.params;
  const body = await request.json();

  // Validate input with type safety
  if (!validateChallengeData(body)) {
    return NextResponse.json(
      { error: 'Title and description are required and must be non-empty strings' },
      { status: 400 }
    );
  }

  const { title, description, startDate, endDate, enrollmentDeadline, participantIds, invitedParticipantIds, enrolledParticipantIds } = body;

  // Require admin access for challenge creation
  const { workspace, user } = await requireWorkspaceAdmin(slug);

  // Create challenge using standardized query
  const challenge = await createChallenge(
    { 
      title, 
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      enrollmentDeadline: enrollmentDeadline ? new Date(enrollmentDeadline) : undefined
    },
    workspace.id
  );

  // Handle participant enrollments
  try {
    // Create invitations for invited participants
    if (invitedParticipantIds && invitedParticipantIds.length > 0) {
      await createChallengeEnrollments(
        challenge.id,
        invitedParticipantIds,
        workspace.id,
        'INVITED'
      );
    }
    
    // Create enrollments for enrolled participants
    if (enrolledParticipantIds && enrolledParticipantIds.length > 0) {
      await createChallengeEnrollments(
        challenge.id,
        enrolledParticipantIds,
        workspace.id,
        'ENROLLED'
      );
    }
    
    // Legacy support: if only participantIds is provided, treat as invited
    if (participantIds && participantIds.length > 0 && !invitedParticipantIds && !enrolledParticipantIds) {
      await createChallengeEnrollments(
        challenge.id,
        participantIds,
        workspace.id,
        'INVITED'
      );
    }
  } catch (error) {
    console.error('Error creating participant enrollments:', error);
    // Continue even if enrollments fail - challenge was created successfully
  }

  return NextResponse.json({ challenge }, { status: 201 });
})

/* TEMPORARY PARTICIPANTS ENDPOINT - WILL MOVE TO OWN FILE */
// This function has been moved to /app/api/workspaces/[slug]/participants/route.ts
// Keeping as internal helper for now but not exported
async function getParticipants(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ParticipantsListResponse | ApiError>> {
  try {
    const { slug } = await context.params;
    
    // Verify authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get workspace with validation
    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Verify user belongs to workspace
    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser || dbUser.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      );
    }

    // Get all workspace users (participants)
    const users = await getWorkspaceUsers(workspace.id);
    
    // Transform to participant format
    const participants = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role
    }));

    return NextResponse.json({ participants });
  } catch (error) {
    console.error('Error fetching participants:', error);
    
    if (error instanceof DatabaseError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}
/* END TEMPORARY PARTICIPANTS ENDPOINT */

