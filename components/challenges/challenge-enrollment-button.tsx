'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Lock } from 'lucide-react';
import { useChallengePermissions } from '@/hooks/use-challenge-permissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChallengeEnrollmentButtonProps {
  challengeId: string;
  workspaceSlug: string;
  onEnroll?: () => Promise<void>;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline';
}

export function ChallengeEnrollmentButton({
  challengeId,
  workspaceSlug,
  onEnroll,
  size = 'default',
  variant = 'default',
}: ChallengeEnrollmentButtonProps) {
  const { permissions, enrollment, isLoading } = useChallengePermissions(
    workspaceSlug,
    challengeId
  );
  const [enrolling, setEnrolling] = useState(false);

  if (isLoading) {
    return (
      <Button size={size} variant={variant} disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  if (!permissions) {
    return null;
  }

  // User is already enrolled
  if (enrollment) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
        <Check className="h-4 w-4 mr-1" />
        Enrolled
      </Badge>
    );
  }

  // User can enroll
  if (permissions.canEnroll) {
    const handleEnroll = async () => {
      if (!onEnroll) return;
      setEnrolling(true);
      try {
        await onEnroll();
      } finally {
        setEnrolling(false);
      }
    };

    return (
      <Button
        size={size}
        variant={variant}
        onClick={handleEnroll}
        disabled={enrolling}
        className={variant === 'default' ? 'bg-coral-500 hover:bg-coral-600' : ''}
      >
        {enrolling ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Enrolling...
          </>
        ) : (
          'Enroll in Challenge'
        )}
      </Button>
    );
  }

  // User cannot enroll (provide explanation)
  const getDisabledReason = () => {
    if (permissions.isParticipant) {
      return 'You are already enrolled in this challenge';
    }
    if (!permissions.isParticipant && !permissions.canEnroll) {
      return 'You do not have permission to enroll in this challenge';
    }
    return 'Enrollment is not available';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button size={size} variant="outline" disabled className="cursor-not-allowed">
              <Lock className="h-4 w-4 mr-2" />
              Cannot Enroll
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getDisabledReason()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
