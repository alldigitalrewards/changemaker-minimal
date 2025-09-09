'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JoinButtonProps {
  challengeId: string;
  workspaceSlug: string;
}

export default function JoinButton({ challengeId, workspaceSlug }: JoinButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });

      if (response.ok) {
        toast({
          title: 'Successfully enrolled!',
          description: 'You have joined this challenge.',
        });
        router.refresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enroll');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enroll in challenge',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      className="w-full bg-coral-500 hover:bg-coral-600"
      onClick={handleJoin}
      disabled={isLoading}
    >
      <UserPlus className="h-4 w-4 mr-2" />
      {isLoading ? 'Joining...' : 'Join Challenge'}
    </Button>
  );
}

// SimpleSubmissionDialog component below
// (This is a temporary approach - should be moved to separate file later)

interface SimpleSubmissionDialogProps {
  activityId: string;
  activityName: string;
  activityType: string;
  pointsValue: number;
  maxSubmissions: number;
  deadline: string | null; // Serialized date
  isRequired: boolean;
  requiresApproval: boolean;
  submissionCount: number;
  challengeId: string;
  challengeTitle: string;
  workspaceSlug: string;
}

export function SimpleSubmissionDialog({
  activityId,
  activityName,
  activityType,
  pointsValue,
  maxSubmissions,
  deadline,
  isRequired,
  requiresApproval,
  submissionCount,
  challengeId,
  challengeTitle,
  workspaceSlug,
}: SimpleSubmissionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [textContent, setTextContent] = useState('')

  const handleSubmit = async () => {
    if (!textContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide some content for your submission',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Action': 'ACTIVITY_SUBMISSION',
        },
        body: JSON.stringify({
          activityId,
          textContent: textContent.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit activity')
      }

      toast({
        title: 'Success!',
        description: 'Your activity has been submitted successfully.',
      })
      setTextContent('')
      setIsOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit activity',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-coral-500 hover:bg-coral-600 flex-1">
          Submit Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-coral-800">Submit Activity</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{activityName}</span> - Worth {pointsValue} points
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Activity Info */}
          <div className="p-3 bg-coral-50 rounded-lg border border-coral-200">
            <p className="text-sm text-coral-700 mb-1">
              <strong>Activity Type:</strong> {activityType.replace('_', ' ').toLowerCase()}
            </p>
            {requiresApproval && (
              <p className="text-xs text-coral-600">
                📋 This submission will be reviewed before points are awarded
              </p>
            )}
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Your Submission</label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter your submission content..."
              rows={4}
              maxLength={500}
              className="w-full p-3 border rounded-md resize-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Be detailed and specific</span>
              <span className={textContent.length > 450 ? 'text-red-500' : ''}>
                {textContent.length}/500 characters
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-coral-500 hover:bg-coral-600"
              onClick={handleSubmit}
              disabled={isSubmitting || !textContent.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Activity'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}