import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  ActivityTemplateCreateResponse,
  validateActivityTemplateData,
  ApiError
} from '@/lib/types';
import { 
  getWorkspaceBySlug,
  getActivityTemplate,
  updateActivityTemplate,
  deleteActivityTemplate,
  getUserBySupabaseId,
  verifyWorkspaceAdmin,
  DatabaseError,
  ResourceNotFoundError,
  WorkspaceAccessError
} from '@/lib/db/queries';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string, id: string }> }
): Promise<NextResponse<ActivityTemplateCreateResponse | ApiError>> {
  try {
    const { slug, id } = await context.params;
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

    const { name, description, type, basePoints, requiresApproval, allowMultiple } = body;

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
        { error: 'Admin privileges required to update activity templates' },
        { status: 403 }
      );
    }

    // Verify template exists and belongs to workspace
    const existingTemplate = await getActivityTemplate(id, workspace.id);
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Activity template not found' },
        { status: 404 }
      );
    }

    // Update activity template
    const template = await updateActivityTemplate(
      id,
      { 
        name, 
        description,
        basePoints,
        requiresApproval: requiresApproval ?? true,
        allowMultiple: allowMultiple ?? false
      },
      workspace.id
    );

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating activity template:', error);
    
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
      { error: 'Failed to update activity template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string, id: string }> }
): Promise<NextResponse<{ success: true } | ApiError>> {
  try {
    const { slug, id } = await context.params;

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
        { error: 'Admin privileges required to delete activity templates' },
        { status: 403 }
      );
    }

    // Verify template exists and belongs to workspace
    const existingTemplate = await getActivityTemplate(id, workspace.id);
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Activity template not found' },
        { status: 404 }
      );
    }

    // Delete activity template
    await deleteActivityTemplate(id, workspace.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity template:', error);
    
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
      { error: 'Failed to delete activity template' },
      { status: 500 }
    );
  }
}