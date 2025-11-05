'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChallengePermissions } from '@/lib/auth/challenge-permissions';

interface PermissionGuardOptions {
  permissions: ChallengePermissions | null;
  isLoading: boolean;
  requireAdmin?: boolean;
  requireManager?: boolean;
  requireCanManage?: boolean;
  requireCanApprove?: boolean;
  requireCanEnroll?: boolean;
  redirectUrl?: string;
  onUnauthorized?: () => void;
}

export function usePermissionGuard({
  permissions,
  isLoading,
  requireAdmin = false,
  requireManager = false,
  requireCanManage = false,
  requireCanApprove = false,
  requireCanEnroll = false,
  redirectUrl,
  onUnauthorized,
}: PermissionGuardOptions) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading || !permissions) {
      setIsAuthorized(false);
      return;
    }

    let authorized = true;

    if (requireAdmin && !permissions.isAdmin) {
      authorized = false;
    }

    if (requireManager && !permissions.isManager) {
      authorized = false;
    }

    if (requireCanManage && !permissions.canManage) {
      authorized = false;
    }

    if (requireCanApprove && !permissions.canApproveSubmissions) {
      authorized = false;
    }

    if (requireCanEnroll && !permissions.canEnroll) {
      authorized = false;
    }

    setIsAuthorized(authorized);

    if (!authorized) {
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (onUnauthorized) {
        onUnauthorized();
      }
    }
  }, [
    permissions,
    isLoading,
    requireAdmin,
    requireManager,
    requireCanManage,
    requireCanApprove,
    requireCanEnroll,
    redirectUrl,
    onUnauthorized,
    router,
  ]);

  return {
    isAuthorized,
    isLoading,
  };
}
