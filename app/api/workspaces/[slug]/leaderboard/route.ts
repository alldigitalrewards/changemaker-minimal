import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getWorkspaceBySlug,
  getUserBySupabaseId,
  verifyWorkspaceAccess,
  DatabaseError,
  WorkspaceAccessError
} from '@/lib/db/queries';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
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

    // Verify user exists
    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user has workspace membership (CRITICAL SECURITY CHECK)
    const hasAccess = await verifyWorkspaceAccess(dbUser.id, workspace.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to workspace' },
        { status: 403 }
      );
    }

    // Get leaderboard - users from this workspace only
    // Note: Points are tracked in PointsBalance table, not directly on User
    const leaderboard = await prisma.user.findMany({
      where: {
        WorkspaceMembership: {
          some: {
            workspaceId: workspace.id
          }
        }
      },
      select: {
        id: true,
        email: true,
        WorkspaceMembership: {
          where: {
            workspaceId: workspace.id
          },
          select: {
            workspaceId: true
          }
        },
        PointsBalance: {
          where: {
            workspaceId: workspace.id
          },
          select: {
            totalPoints: true
          }
        }
      },
      take: 100 // Limit to top 100
    });

    // Transform to ensure workspaceId is at the top level for easy testing
    const transformedLeaderboard = leaderboard
      .map(user => ({
        id: user.id,
        email: user.email,
        totalPoints: user.PointsBalance[0]?.totalPoints || 0,
        workspaceId: user.WorkspaceMembership[0]?.workspaceId || workspace.id
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints); // Sort by points descending

    return NextResponse.json({ leaderboard: transformedLeaderboard }, { status: 200 });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);

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
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
