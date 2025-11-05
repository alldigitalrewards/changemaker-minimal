'use client';

import { useChallengePermissions } from '@/hooks/use-challenge-permissions';
import { Badge } from '@/components/ui/badge';

interface ChallengeRoleBadgeProps {
  challengeId: string;
  workspaceSlug: string;
}

export function ChallengeRoleBadge({ challengeId, workspaceSlug }: ChallengeRoleBadgeProps) {
  const { permissions, isLoading } = useChallengePermissions(workspaceSlug, challengeId);

  if (isLoading || !permissions) return null;

  if (permissions.isParticipant && permissions.isManager) {
    return <Badge variant="secondary">Managing & Enrolled</Badge>;
  }

  if (permissions.isManager) {
    return <Badge variant="secondary">Managing</Badge>;
  }

  if (permissions.isParticipant) {
    return <Badge variant="outline">Enrolled</Badge>;
  }

  return null;
}
