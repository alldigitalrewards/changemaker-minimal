'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X } from 'lucide-react';
import { useChallengePermissions } from '@/hooks/use-challenge-permissions';
import { canApproveSubmission } from '@/lib/auth/challenge-permissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SubmissionData {
  id: string;
  userId: string;
  status: string;
  challengeId: string;
}

interface SubmissionApprovalActionsProps {
  submission: SubmissionData;
  workspaceSlug: string;
  currentUserId?: string;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
}

export function SubmissionApprovalActions({
  submission,
  workspaceSlug,
  currentUserId,
  onApprove,
  onReject,
}: SubmissionApprovalActionsProps) {
  const { permissions, isLoading } = useChallengePermissions(
    workspaceSlug,
    submission.challengeId
  );
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading permissions...</span>
      </div>
    );
  }

  if (!permissions) {
    return (
      <Badge variant="outline">
        {submission.status}
      </Badge>
    );
  }

  // Check if this is the user's own submission
  const isOwnSubmission = currentUserId && submission.userId === currentUserId;

  // Check if user can approve (has permission AND not their own submission)
  const hasApprovalPermission = currentUserId
    ? canApproveSubmission(permissions, submission.userId, currentUserId)
    : false;

  // If it's the user's own submission, show special badge
  if (isOwnSubmission) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
          Your Submission
        </Badge>
        <Badge variant="outline">
          {submission.status}
        </Badge>
      </div>
    );
  }

  // If user has approval permission, show action buttons
  if (hasApprovalPermission && submission.status === 'PENDING') {
    const handleApprove = async () => {
      if (!onApprove) return;
      setActionLoading('approve');
      try {
        await onApprove(submission.id);
      } finally {
        setActionLoading(null);
      }
    };

    const handleReject = async () => {
      if (!onReject) return;
      setActionLoading('reject');
      try {
        await onReject(submission.id);
      } finally {
        setActionLoading(null);
      }
    };

    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={handleApprove}
          disabled={!!actionLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {actionLoading === 'approve' ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={!!actionLoading}
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          {actionLoading === 'reject' ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          Request Revision
        </Button>
      </div>
    );
  }

  // If user has approval permission but can't approve this one, explain why
  if (permissions.canApproveSubmissions && submission.status === 'PENDING') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="cursor-help">
              {submission.status}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>You cannot approve your own submissions</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default: Just show status badge
  return (
    <Badge variant="outline">
      {submission.status}
    </Badge>
  );
}
