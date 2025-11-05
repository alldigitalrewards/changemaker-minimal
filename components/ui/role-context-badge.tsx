'use client';

import { Badge } from '@/components/ui/badge';
import { ChallengePermissions } from '@/lib/auth/challenge-permissions';
import { ShieldCheck, Users, User } from 'lucide-react';

interface RoleContextBadgeProps {
  permissions: ChallengePermissions;
  showDetails?: boolean;
}

export function RoleContextBadge({
  permissions,
  showDetails = false,
}: RoleContextBadgeProps) {
  const getRoleIcon = () => {
    switch (permissions.role) {
      case 'ADMIN':
        return <ShieldCheck className="w-3 h-3" />;
      case 'CHALLENGE_MANAGER':
      case 'MANAGER':
        return <Users className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const getRoleLabel = () => {
    if (permissions.isParticipant && permissions.isManager) {
      return 'Manager & Participant';
    }
    return permissions.role.replace('_', ' ');
  };

  const getRoleVariant = (): 'default' | 'secondary' | 'outline' => {
    if (permissions.isAdmin) return 'default';
    if (permissions.isManager) return 'secondary';
    return 'outline';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getRoleVariant()} className="flex items-center gap-1">
        {getRoleIcon()}
        {getRoleLabel()}
      </Badge>

      {showDetails && (
        <div className="text-xs text-muted-foreground">
          {permissions.isParticipant && <span>Enrolled</span>}
          {permissions.isManager && permissions.isParticipant && (
            <span> • </span>
          )}
          {permissions.isManager && <span>Managing</span>}
        </div>
      )}
    </div>
  );
}
