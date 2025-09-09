'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubmissionReviewButtonProps {
  submissionId: string;
  action: 'approve' | 'reject';
  workspaceSlug: string;
  pointsValue: number;
}

export function SubmissionReviewButton({ 
  submissionId, 
  action, 
  workspaceSlug,
  pointsValue 
}: SubmissionReviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleReview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          reviewNotes: reviewNotes.trim() || undefined,
          pointsAwarded: action === 'approve' ? pointsValue : 0
        }),
      });

      if (response.ok) {
        toast({
          title: `Submission ${action === 'approve' ? 'approved' : 'rejected'}!`,
          description: action === 'approve' 
            ? `Points awarded: ${pointsValue}` 
            : 'Submission has been rejected.',
        });
        setIsOpen(false);
        setReviewNotes('');
        router.refresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} submission`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} submission`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={
            action === 'approve' 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-red-500 hover:bg-red-600 text-white'
          }
        >
          {action === 'approve' ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Approve
            </>
          ) : (
            <>
              <X className="h-3 w-3 mr-1" />
              Reject
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'Approve Submission' : 'Reject Submission'}
          </DialogTitle>
          <DialogDescription>
            {action === 'approve' 
              ? `Award ${pointsValue} points for this submission?`
              : 'Are you sure you want to reject this submission?'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Review Notes {action === 'reject' ? '(required)' : '(optional)'}
            </label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                action === 'approve' 
                  ? 'Add any feedback or comments...' 
                  : 'Please provide a reason for rejection...'
              }
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className={`flex-1 ${
                action === 'approve' 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
              onClick={handleReview}
              disabled={isLoading || (action === 'reject' && !reviewNotes.trim())}
            >
              {isLoading ? 'Processing...' : action === 'approve' ? 'Approve & Award Points' : 'Reject Submission'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}