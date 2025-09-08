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