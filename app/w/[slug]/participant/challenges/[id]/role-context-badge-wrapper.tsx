'use client';

import { RoleContextBadge } from '@/components/ui/role-context-badge';
import { useChallengePermissions } from '@/hooks/use-challenge-permissions';

interface RoleContextBadgeWrapperProps {
  workspaceSlug: string;
  challengeId: string;
  showDetails?: boolean;
}

export function RoleContextBadgeWrapper({
  workspaceSlug,
  challengeId,
  showDetails = false,
}: RoleContextBadgeWrapperProps) {
  const { permissions, isLoading } = useChallengePermissions(workspaceSlug, challengeId);

  if (isLoading || !permissions) return null;

  return <RoleContextBadge permissions={permissions} showDetails={showDetails} />;
}
