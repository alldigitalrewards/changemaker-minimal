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
      className="w-full bg-blue-500 hover:bg-blue-600"
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
  activity: {
    id: string
    pointsValue: number
    maxSubmissions: number
    deadline: Date | null
    isRequired: boolean
    template: {
      id: string
      name: string
      description: string
      type: string
      requiresApproval: boolean
    }
    submissions: any[]
  }
  challenge: {
    id: string
    title: string
  }
  workspaceSlug: string
}

export function SimpleSubmissionDialog({
  activity,
  challenge,
  workspaceSlug,
}: SimpleSubmissionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
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
          activityId: activity.id,
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
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-coral-500 hover:bg-coral-600">
          Submit Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Activity</DialogTitle>
          <DialogDescription>
            {activity.template.name} - {activity.pointsValue} points
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Submission</label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter your submission content..."
              rows={4}
              className="w-full p-3 border rounded-md resize-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {textContent.length}/500 characters
            </p>
          </div>
          <div className="flex gap-2">
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </DialogTrigger>
            <Button 
              className="flex-1 bg-coral-500 hover:bg-coral-600"
              onClick={handleSubmit}
              disabled={isSubmitting || !textContent.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}