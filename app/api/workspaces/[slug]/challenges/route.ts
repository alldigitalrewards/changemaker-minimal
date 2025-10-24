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
    const safeChallenges = challenges.map((c) => {
      // Normalize and narrow to API Challenge type (omit extra prisma fields)
      const rewardType = (c as any).rewardType ?? undefined
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        startDate: c.startDate as Date,
        endDate: c.endDate as Date,
        enrollmentDeadline: (c as any).enrollmentDeadline ?? null,
        workspaceId: c.workspaceId,
        rewardType: rewardType as 'points' | 'sku' | 'monetary' | undefined,
        rewardConfig: (c as any).rewardConfig,
        emailEditAllowed: (c as any).emailEditAllowed,
        status: (c as any).status ?? 'DRAFT',
        createdAt: (c as any).createdAt,
        updatedAt: (c as any).updatedAt,
        _count: (c as any)._count ?? { enrollments: 0 }
      }
    })

    return NextResponse.json({ challenges: safeChallenges });
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

    const { title, description, startDate, endDate, enrollmentDeadline, rewardType, rewardConfig, emailEditAllowed, requireManagerApproval, requireAdminReapproval, participantIds, invitedParticipantIds, enrolledParticipantIds, sourceChallengeId, activities } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0 ||
        !description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title and description are required and must be non-empty strings' },
        { status: 400 }
      );
    }

    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: 'Challenge end date must be after start date' },
        { status: 400 }
      );
    }

    // Validate enrollment deadline if provided
    if (enrollmentDeadline) {
      const deadline = new Date(enrollmentDeadline);
      if (isNaN(deadline.getTime()) || deadline > start) {
        return NextResponse.json(
          { error: 'Enrollment deadline must be before or equal to start date' },
          { status: 400 }
        );
      }
    }

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

    // Normalize rewardType to lowercase for Prisma enum
    const normalizedRewardType = rewardType ? (rewardType.toLowerCase() as 'points' | 'sku' | 'monetary') : undefined;

    // Create challenge using standardized query
    const challenge = await createChallenge(
      {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        enrollmentDeadline: enrollmentDeadline ? new Date(enrollmentDeadline) : undefined,
        rewardType: normalizedRewardType,
        rewardConfig,
        emailEditAllowed,
        requireManagerApproval,
        requireAdminReapproval
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

    // Handle activities if provided
    if (activities && Array.isArray(activities) && activities.length > 0) {
      try {
        const { prisma } = await import('@/lib/db');
        const activityCreateData = activities.map((activity, index) => ({
          id: crypto.randomUUID(),
          templateId: activity.templateId,
          challengeId: challenge.id,
          pointsValue: activity.pointsValue || 0,
          maxSubmissions: activity.maxSubmissions || 1,
          isRequired: activity.isRequired !== undefined ? activity.isRequired : false,
          position: index,
          deadline: activity.deadline ? new Date(activity.deadline) : null
        }));

        await prisma.activity.createMany({
          data: activityCreateData
        });
      } catch (error) {
        console.error('Error creating activities:', error);
        // Continue even if activities fail - challenge was created successfully
      }
    }

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

    // Narrow response to API Challenge type
    const normalized: any = {
      id: challenge.id,
      title: (challenge as any).title,
      description: (challenge as any).description,
      startDate: (challenge as any).startDate,
      endDate: (challenge as any).endDate,
      enrollmentDeadline: (challenge as any).enrollmentDeadline ?? null,
      workspaceId: (challenge as any).workspaceId,
      rewardType: (challenge as any).rewardType ?? undefined,
      rewardConfig: (challenge as any).rewardConfig,
      emailEditAllowed: (challenge as any).emailEditAllowed,
    }
    return NextResponse.json({ challenge: normalized }, { status: 201 });
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

