'use client';

import { useState, useEffect } from 'react';
import { ChallengePermissions } from '@/lib/auth/challenge-permissions';

interface PermissionsData {
  permissions: ChallengePermissions;
  enrollment: any | null;
  assignment: any | null;
}

export function useChallengePermissions(workspaceSlug: string, challengeId: string) {
  const [data, setData] = useState<PermissionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/workspaces/${workspaceSlug}/challenges/${challengeId}/permissions`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }

        const responseData = await response.json();
        setData(responseData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    if (workspaceSlug && challengeId) {
      fetchPermissions();
    }
  }, [workspaceSlug, challengeId]);

  return {
    permissions: data?.permissions || null,
    enrollment: data?.enrollment || null,
    assignment: data?.assignment || null,
    isLoading,
    error
  };
}
