import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
  getWorkspaceBySlug,
  getWorkspaceChallenges, 
  createChallenge,
  createChallengeEnrollments,
  getWorkspaceUsers,
  getUserBySupabaseId,
  verifyWorkspaceAdmin,
  DatabaseError,
  ResourceNotFoundError,
  WorkspaceAccessError
} from '@/lib/db/queries';
import { logActivityEvent } from '@/lib/db/queries'

// Remove the temporary function - will create in separate file

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ChallengeListResponse | ApiError>> {
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

    // Get challenges with user-specific enrollment data
    const challenges = await getWorkspaceChallenges(workspace.id);
    
    // Filter enrollments to only show current user's enrollment status
    const challengesWithUserEnrollment = challenges.map(challenge => ({
      ...challenge,
      enrollments: challenge.enrollments?.filter(enrollment => 
        enrollment.userId === dbUser.id
      ) || []
    }));

    return NextResponse.json({ challenges: challengesWithUserEnrollment });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    
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
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ChallengeCreateResponse | ApiError>> {
  try {
    const { slug } = await context.params;
    const body = await request.json();

    // Verify authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate input with type safety
    if (!validateChallengeData(body)) {
      return NextResponse.json(
        { error: 'Title and description are required and must be non-empty strings' },
        { status: 400 }
      );
    }

    const { title, description, startDate, endDate, enrollmentDeadline, rewardType, rewardConfig, participantIds, invitedParticipantIds, enrolledParticipantIds, sourceChallengeId } = body;

    // Find workspace with validation
    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Verify user is admin of this workspace
    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser || dbUser.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      );
    }

    const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin privileges required to create challenges' },
        { status: 403 }
      );
    }

    // Create challenge using standardized query
    const challenge = await createChallenge(
      { 
        title, 
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        enrollmentDeadline: enrollmentDeadline ? new Date(enrollmentDeadline) : undefined,
        rewardType,
        rewardConfig
      },
      workspace.id
    );

    // Log challenge created / duplicated
    await logActivityEvent({
      workspaceId: workspace.id,
      challengeId: challenge.id,
      actorUserId: dbUser.id,
      type: sourceChallengeId ? 'CHALLENGE_DUPLICATED' : 'CHALLENGE_CREATED',
      metadata: sourceChallengeId ? { sourceChallengeId, title } : { title }
    })

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
  } catch (error) {
    console.error('Error creating challenge:', error);
    
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
      { error: 'Failed to create challenge' },
      { status: 500 }
    );
  }
}

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

