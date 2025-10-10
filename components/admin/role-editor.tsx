'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil } from 'lucide-react';

interface RoleEditorProps {
  userId: string;
  workspaceId: string;
  currentRole: 'ADMIN' | 'PARTICIPANT';
  onUpdate: () => void;
}

export function RoleEditor({ userId, workspaceId, currentRole, onUpdate }: RoleEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'PARTICIPANT'>(currentRole);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (selectedRole === currentRole) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, role: selectedRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
      setSelectedRole(currentRole);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedRole(currentRole);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          currentRole === 'ADMIN'
            ? 'bg-coral-100 text-coral-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {currentRole === 'ADMIN' ? 'Admin' : 'Participant'}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'ADMIN' | 'PARTICIPANT')}>
        <SelectTrigger className="h-7 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="PARTICIPANT">Participant</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
        onClick={handleSave}
        disabled={isLoading}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
        onClick={handleCancel}
        disabled={isLoading}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
