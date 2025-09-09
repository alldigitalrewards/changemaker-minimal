'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, X } from 'lucide-react';
import type { WorkspaceParticipant, UserId } from '@/lib/types';

interface ParticipantSelectorProps {
  workspaceSlug: string;
  selectedParticipantIds: UserId[];
  onParticipantsChange: (participantIds: UserId[]) => void;
  disabled?: boolean;
}

export function ParticipantSelector({
  workspaceSlug,
  selectedParticipantIds,
  onParticipantsChange,
  disabled = false
}: ParticipantSelectorProps) {
  const [participants, setParticipants] = useState<WorkspaceParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (workspaceSlug) {
      fetchParticipants();
    }
  }, [workspaceSlug]);

  const fetchParticipants = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/participants`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants || []);
      } else {
        throw new Error('Failed to fetch participants');
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
      setParticipants([]);
      
      toast({
        title: 'Error',
        description: 'Failed to load participants',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParticipant = (participantId: string) => {
    if (participantId && !selectedParticipantIds.includes(participantId)) {
      onParticipantsChange([...selectedParticipantIds, participantId]);
      setSelectedValue('');
    }
  };

  const handleRemoveParticipant = (participantId: UserId) => {
    onParticipantsChange(selectedParticipantIds.filter(id => id !== participantId));
  };

  const getSelectedParticipants = () => {
    return participants.filter(p => selectedParticipantIds.includes(p.id));
  };

  const getAvailableParticipants = () => {
    return participants.filter(p => !selectedParticipantIds.includes(p.id));
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        Invite Participants (Optional)
      </Label>
      
      {/* Add Participant Selector */}
      <div className="flex space-x-2">
        <div className="flex-1">
          <Select 
            value={selectedValue} 
            onValueChange={(value) => {
              setSelectedValue(value);
              handleAddParticipant(value);
            }}
            disabled={disabled || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                isLoading 
                  ? "Loading participants..." 
                  : getAvailableParticipants().length === 0 
                    ? "No participants available"
                    : "Select a participant to invite"
              } />
            </SelectTrigger>
            <SelectContent>
              {getAvailableParticipants().map((participant) => (
                <SelectItem key={participant.id} value={participant.id}>
                  <div className="flex items-center space-x-2">
                    <span>{participant.email}</span>
                    <span className="text-xs text-gray-500">({participant.role})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected Participants List */}
      {selectedParticipantIds.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600 flex items-center">
            <Users className="h-4 w-4 mr-1" />
            Selected participants ({selectedParticipantIds.length})
          </div>
          <div className="space-y-1">
            {getSelectedParticipants().map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{participant.email}</span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    {participant.role}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveParticipant(participant.id)}
                  disabled={disabled}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500">
        {selectedParticipantIds.length === 0 
          ? "Participants will be invited and need to accept to join the challenge."
          : `${selectedParticipantIds.length} participant${selectedParticipantIds.length === 1 ? '' : 's'} will be invited to this challenge.`
        }
      </div>
    </div>
  );
}