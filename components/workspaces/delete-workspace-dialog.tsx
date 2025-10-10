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
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteWorkspaceDialogProps {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  isOwner: boolean;
  trigger?: React.ReactNode;
}

export function DeleteWorkspaceDialog({
  workspaceId,
  workspaceName,
  workspaceSlug,
  isOwner,
  trigger
}: DeleteWorkspaceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmValid = confirmText === workspaceName;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete workspace');
      }

      toast.success('Workspace deleted successfully');
      router.push('/workspaces');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete workspace');
      setIsDeleting(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Workspace
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Workspace
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the workspace and all associated data.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <strong className="font-semibold">Warning:</strong> Deleting this workspace will:
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
              <li>Remove all challenges and activities</li>
              <li>Delete all participant submissions</li>
              <li>Remove all workspace members</li>
              <li>Permanently delete all data</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-name">
              Type <span className="font-bold">{workspaceName}</span> to confirm
            </Label>
            <Input
              id="confirm-name"
              placeholder={workspaceName}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <p className="font-semibold text-gray-900 mb-2">What happens next:</p>
            <ol className="list-decimal ml-4 space-y-1 text-gray-700">
              <li>All workspace data will be permanently deleted</li>
              <li>Members will lose access immediately</li>
              <li>You'll be redirected to the workspaces page</li>
              <li>This action cannot be reversed</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
