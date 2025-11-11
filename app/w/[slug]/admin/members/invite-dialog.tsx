'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Copy, Check, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface InviteDialogProps {
  workspaceSlug: string;
  trigger?: React.ReactNode;
}

export function InviteDialog({ workspaceSlug, trigger }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [role, setRole] = useState<'ADMIN' | 'PARTICIPANT'>('PARTICIPANT');
  const [targetEmail, setTargetEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          targetEmail: targetEmail || null,
          expiresInDays,
          maxUses
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create invitation');
      }

      const data = await response.json();
      setInviteCode(data.code);
      toast.success('Invitation code generated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteCode) return;

    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success('Invite code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setInviteCode(null);
    setTargetEmail('');
    setRole('PARTICIPANT');
    setExpiresInDays(30);
    setMaxUses(1);
    setCopied(false);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(handleReset, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" className="bg-gray-900 hover:bg-gray-800">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Members
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Members to Workspace</DialogTitle>
          <DialogDescription>
            Generate an invitation code to share with new members
          </DialogDescription>
        </DialogHeader>

        {!inviteCode ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'PARTICIPANT')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARTICIPANT">Participant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Target Email (Optional)
                <span className="text-xs text-gray-500 ml-2">
                  Leave empty for anyone to use
                </span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires">Expires In (Days)</Label>
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  max="365"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  max="100"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value))}
                />
              </div>
            </div>

            {role === 'ADMIN' && (
              <Alert>
                <AlertDescription>
                  Admin invitations grant full workspace management permissions. Only invite trusted users.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Invitation Code</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteCode}
                  readOnly
                  className="font-mono text-lg font-bold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription className="ml-2">
                Share this code with the person you want to invite. They can redeem it on the workspaces page.
                {targetEmail && (
                  <div className="mt-2 text-sm">
                    <strong>Restricted to:</strong> {targetEmail}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <p><strong>Role:</strong> {role}</p>
              <p><strong>Expires:</strong> {expiresInDays} days from now</p>
              <p><strong>Max Uses:</strong> {maxUses}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!inviteCode ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Code'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
