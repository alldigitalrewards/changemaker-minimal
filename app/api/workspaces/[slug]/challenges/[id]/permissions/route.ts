import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess, withErrorHandling } from '@/lib/auth/api-auth';
import { fetchUserChallengeContext } from '@/lib/auth/challenge-permissions';

/**
 * GET /api/workspaces/[slug]/challenges/[id]/permissions
 * Get user's permissions for a specific challenge
 * Returns ChallengePermissions object for UI consumption
 */
export const GET = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ slug: string; id: string }> },
  ): Promise<NextResponse> => {
    const { slug, id: challengeId } = await context.params;

    // Require workspace access
    const { workspace, user } = await requireWorkspaceAccess(slug);

    try {
      // Fetch user's challenge permissions
      const permissionContext = await fetchUserChallengeContext(
        user.dbUser.id,
        challengeId,
        workspace.id,
      );

      return NextResponse.json({
        permissions: permissionContext.permissions,
        enrollment: permissionContext.enrollment,
        assignment: permissionContext.assignment,
      });
    } catch (error) {
      console.error('Error fetching challenge permissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch challenge permissions' },
        { status: 500 },
      );
    }
  },
);
