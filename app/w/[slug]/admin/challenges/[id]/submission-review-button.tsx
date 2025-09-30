'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
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
  const [rewardType, setRewardType] = useState<'points' | 'sku' | 'monetary'>('points')
  const [amount, setAmount] = useState<string>('')
  const [currency, setCurrency] = useState<string>('USD')
  const [skuId, setSkuId] = useState<string>('')
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
          pointsAwarded: action === 'approve' ? pointsValue : 0,
          reward: action === 'approve' ? {
            type: rewardType,
            amount: rewardType === 'points' || rewardType === 'monetary' ? Number(amount || pointsValue) : undefined,
            currency: rewardType === 'monetary' ? currency : undefined,
            skuId: rewardType === 'sku' ? (skuId || undefined) : undefined
          } : undefined
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
          {action === 'approve' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Reward Type</label>
                <Select value={rewardType} onValueChange={(v) => setRewardType(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select reward type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="sku">SKU</SelectItem>
                    <SelectItem value="monetary">Monetary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(rewardType === 'points' || rewardType === 'monetary') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Amount</label>
                    <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(pointsValue)} />
                  </div>
                  {rewardType === 'monetary' && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Currency</label>
                      <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
                    </div>
                  )}
                </div>
              )}
              {rewardType === 'sku' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">SKU ID</label>
                  <Input value={skuId} onChange={(e) => setSkuId(e.target.value)} placeholder="e.g. giftcard_25" />
                </div>
              )}
            </div>
          )}
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
              {isLoading ? 'Processing...' : action === 'approve' ? 'Approve & Award' : 'Reject Submission'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}