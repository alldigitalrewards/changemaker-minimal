'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
      // For now, simulate successful submission
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: 'Success!',
        description: 'Your activity has been submitted successfully (simulated).',
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
    <div className="space-y-2">
      <textarea
        value={textContent}
        onChange={(e) => setTextContent(e.target.value)}
        placeholder="Enter your submission..."
        rows={3}
        className="w-full p-2 border rounded-md resize-none"
      />
      <Button 
        className="bg-coral-500 hover:bg-coral-600"
        onClick={handleSubmit}
        disabled={isSubmitting || !textContent.trim()}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Activity'}
      </Button>
    </div>
  )
}