import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  WorkspaceApiProps, 
  ActivityTemplateCreateRequest, 
  ActivityTemplateListResponse,
  ActivityTemplateCreateResponse,
  type RewardType,
  validateActivityTemplateData,
  ApiError
} from '@/lib/types';
import { 
  getWorkspaceBySlug,
  getWorkspaceActivityTemplates,
  createActivityTemplate,
  getUserBySupabaseId,
  verifyWorkspaceAdmin,
  DatabaseError,
  ResourceNotFoundError,
  WorkspaceAccessError
} from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ActivityTemplateListResponse | ApiError>> {
  try {
    const { slug } = await context.params;

    // Verify authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Find workspace with validation
    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Verify user exists
    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user is admin of this workspace
    const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin privileges required to view activity templates' },
        { status: 403 }
      );
    }

    // Get activity templates for this workspace
    const templates = await getWorkspaceActivityTemplates(workspace.id);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching activity templates:', error);
    
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
      { error: 'Failed to fetch activity templates' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ActivityTemplateCreateResponse | ApiError>> {
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
    if (!validateActivityTemplateData(body)) {
      return NextResponse.json(
        { error: 'Name, description, type, and basePoints are required' },
        { status: 400 }
      );
    }

    const { name, description, type, basePoints, rewardType, rewardConfig, requiresApproval, allowMultiple } = body;

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
        { error: 'Admin privileges required to create activity templates' },
        { status: 403 }
      );
    }

    // Normalize rewardType to lowercase for Prisma enum and default to points
    const normalizedRewardType = (
      typeof rewardType === 'string'
        ? rewardType.toLowerCase()
        : rewardType
    ) as RewardType | undefined;
    const finalRewardType: RewardType = normalizedRewardType ?? 'points';

    // Create activity template
    const template = await createActivityTemplate(
      {
        name,
        description,
        type,
        basePoints,
        rewardType: finalRewardType,
        rewardConfig: rewardConfig ?? undefined,
        requiresApproval: requiresApproval ?? true,
        allowMultiple: allowMultiple ?? false
      },
      workspace.id
    );

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity template:', error);
    
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
      { error: 'Failed to create activity template' },
      { status: 500 }
    );
  }
}
