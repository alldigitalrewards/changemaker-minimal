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

type TimePeriod = 'day' | 'week' | 'month' | 'all';

function getDateFilter(period: TimePeriod): Date | null {
  const now = new Date();

  switch (period) {
    case 'day':
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      return startOfDay;
    case 'week':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      return startOfWeek;
    case 'month':
      const startOfMonth = new Date(now);
      startOfMonth.setMonth(now.getMonth() - 1);
      return startOfMonth;
    case 'all':
    default:
      return null;
  }
}

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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'all') as TimePeriod;
    const challengeId = searchParams.get('challengeId');

    const dateFilter = getDateFilter(period);

    // Build where clause for ActivityEvents
    const whereClause: any = {
      Challenge: {
        workspaceId: workspace.id
      }
    };

    // Add time filter if not 'all'
    if (dateFilter) {
      whereClause.createdAt = {
        gte: dateFilter
      };
    }

    // Add challenge filter if specified
    if (challengeId && challengeId !== 'all') {
      whereClause.challengeId = challengeId;
    }

    // Get activity events with aggregation
    const activityEvents = await prisma.activityEvent.findMany({
      where: whereClause,
      include: {
        User_ActivityEvent_userIdToUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
            isPending: true
          }
        },
        Challenge: {
          select: {
            id: true,
            workspaceId: true
          }
        }
      }
    });

    // Filter out pending users and aggregate by user
    const userActivityMap = new Map<string, {
      userId: string
      name: string
      email: string
      activityCount: number
      avatarUrl: string | null
    }>();

    activityEvents.forEach(event => {
      const user = event.User_ActivityEvent_userIdToUser;
      if (!user || user.isPending) return;

      const userId = user.id;
      const existing = userActivityMap.get(userId);

      if (existing) {
        existing.activityCount += 1;
      } else {
        const name = user.displayName ||
                     (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` :
                     (user.firstName || user.email.split('@')[0]));

        userActivityMap.set(userId, {
          userId: user.id,
          name,
          email: user.email,
          activityCount: 1,
          avatarUrl: null
        });
      }
    });

    // Convert to array and sort by activity count
    const leaderboard = Array.from(userActivityMap.values())
      .sort((a, b) => b.activityCount - a.activityCount);

    // Calculate stats
    const activityCounts = leaderboard.map(entry => entry.activityCount);
    const topCount = activityCounts[0] || 0;
    const averageCount = activityCounts.length > 0
      ? Math.round(activityCounts.reduce((sum, count) => sum + count, 0) / activityCounts.length)
      : 0;

    return NextResponse.json({
      leaderboard,
      stats: {
        topCount,
        averageCount,
        participantCount: leaderboard.length,
        hiddenCount: 0
      }
    }, { status: 200 });
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
