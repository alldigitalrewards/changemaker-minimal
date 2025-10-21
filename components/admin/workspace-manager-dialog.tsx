'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceManagerDialogProps {
  userId: string;
  userEmail: string;
  currentWorkspaces: Workspace[];
  allWorkspaces: Workspace[];
  onUpdate: () => void;
}

export function WorkspaceManagerDialog({
  userId,
  userEmail,
  currentWorkspaces,
  allWorkspaces,
  onUpdate,
}: WorkspaceManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'PARTICIPANT'>('PARTICIPANT');
  const [isLoading, setIsLoading] = useState(false);

  const availableWorkspaces = allWorkspaces.filter(
    (ws) => !currentWorkspaces.some((cws) => cws.id === ws.id)
  );

  const handleAddWorkspace = async () => {
    if (!selectedWorkspace) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: selectedWorkspace, role: selectedRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to add workspace');
      }

      setSelectedWorkspace('');
      setSelectedRole('PARTICIPANT');
      onUpdate();
    } catch (error) {
      console.error('Error adding workspace:', error);
      alert('Failed to add workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (!confirm(`Remove ${userEmail} from ${workspaceName}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users/${userId}/workspace?workspaceId=${workspaceId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove workspace');
      }

      onUpdate();
    } catch (error) {
      console.error('Error removing workspace:', error);
      alert('Failed to remove workspace');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          Manage Workspaces
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Workspace Memberships</DialogTitle>
          <DialogDescription>
            Add or remove {userEmail} from workspaces
          </DialogDescription>
        </DialogHeader>

        {/* Current Workspaces */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Current Workspaces</h3>
            {currentWorkspaces.length === 0 ? (
              <p className="text-sm text-gray-500">Not a member of any workspaces</p>
            ) : (
              <div className="space-y-2">
                {currentWorkspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <span className="text-sm font-medium">{ws.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-red-600 hover:text-red-700"
                      onClick={() => handleRemoveWorkspace(ws.id, ws.name)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Workspace */}
          {availableWorkspaces.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Add to Workspace</h3>
              <div className="flex gap-2">
                <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select workspace..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWorkspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARTICIPANT">Participant</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddWorkspace}
                  disabled={!selectedWorkspace || isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
