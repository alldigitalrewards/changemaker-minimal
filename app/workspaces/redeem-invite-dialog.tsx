'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ticket, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RedeemInviteDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function RedeemInviteDialog({ trigger, onSuccess }: RedeemInviteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/invites/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to redeem invite code');
      }

      const data = await response.json();
      setSuccess(true);
      toast.success('Invitation redeemed successfully!');

      // Wait a moment then redirect
      setTimeout(() => {
        setOpen(false);
        router.refresh();
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to redeem invite code');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setCode('');
      setSuccess(false);
      setLoading(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Ticket className="h-4 w-4 mr-2" />
            Redeem Invite Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Redeem Invitation Code</DialogTitle>
          <DialogDescription>
            Enter the invite code you received to join a workspace
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Invitation Code</Label>
              <Input
                id="code"
                placeholder="XXXXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono text-lg uppercase"
                maxLength={8}
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Enter the 8-character code provided by the workspace admin
              </p>
            </div>

            <Alert>
              <AlertDescription>
                Once redeemed, you'll gain access to the workspace and any challenges included in the invitation.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Invitation Redeemed!
            </h3>
            <p className="text-gray-600">
              You now have access to the workspace. Redirecting...
            </p>
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleRedeem}
              disabled={!code.trim() || loading}
              className="bg-gray-900 hover:bg-gray-800"
            >
              {loading ? 'Redeeming...' : 'Redeem Code'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
