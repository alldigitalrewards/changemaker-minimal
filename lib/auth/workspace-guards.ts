import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * Server-side guard that requires ADMIN or MANAGER role in workspace
 * Redirects to workspace home if unauthorized
 */
export async function requireWorkspaceAdmin(workspaceSlug: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) {
    redirect('/');
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
  });

  if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MANAGER')) {
    redirect(`/w/${workspaceSlug}`);
  }

  return { user, workspace, membership };
}

/**
 * Server-side guard that requires any workspace membership
 * Redirects to sign in if not authenticated, home if no access
 */
export async function requireWorkspaceAccess(workspaceSlug: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) {
    redirect('/');
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
  });

  if (!membership) {
    redirect('/');
  }

  return { user, workspace, membership };
}
