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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Users, X, UserPlus, UserCheck, Info } from 'lucide-react';
import type { WorkspaceParticipant, UserId } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface ParticipantData {
  invited: UserId[];
  enrolled: UserId[];
}

interface ParticipantSelectorProps {
  workspaceSlug: string;
  selectedParticipantIds: UserId[];
  onParticipantsChange: (participantIds: UserId[]) => void;
  disabled?: boolean;
  // New props for two-tab system
  initialInvitedIds?: UserId[];
  initialEnrolledIds?: UserId[];
  onParticipantDataChange?: (data: ParticipantData) => void;
}

interface SelectedParticipant {
  id: UserId;
  email: string;
  role: string;
  autoEnroll: boolean;
}

export function ParticipantSelector({
  workspaceSlug,
  selectedParticipantIds,
  onParticipantsChange,
  disabled = false,
  initialInvitedIds = [],
  initialEnrolledIds = [],
  onParticipantDataChange
}: ParticipantSelectorProps) {
  const [participants, setParticipants] = useState<WorkspaceParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);
  const [selectValue, setSelectValue] = useState('');
  const [autoEnrollAll, setAutoEnrollAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (workspaceSlug) {
      fetchParticipants();
    }
  }, [workspaceSlug]);

  // Initialize from props
  useEffect(() => {
    const initialSelected: SelectedParticipant[] = [];

    // Add invited participants
    initialInvitedIds.forEach(id => {
      const participant = participants.find(p => p.id === id);
      if (participant) {
        initialSelected.push({
          id: participant.id,
          email: participant.email,
          role: participant.role,
          autoEnroll: false
        });
      }
    });

    // Add enrolled participants
    initialEnrolledIds.forEach(id => {
      const participant = participants.find(p => p.id === id);
      if (participant) {
        initialSelected.push({
          id: participant.id,
          email: participant.email,
          role: participant.role,
          autoEnroll: true
        });
      }
    });

    if (initialSelected.length > 0) {
      setSelectedParticipants(initialSelected);
    }
  }, [initialInvitedIds, initialEnrolledIds, participants]);

  // Notify parent of changes
  useEffect(() => {
    const invitedIds = selectedParticipants
      .filter(p => !p.autoEnroll)
      .map(p => p.id);
    const enrolledIds = selectedParticipants
      .filter(p => p.autoEnroll)
      .map(p => p.id);

    if (onParticipantDataChange) {
      onParticipantDataChange({ invited: invitedIds, enrolled: enrolledIds });
    } else {
      // Legacy mode: use all selected as invited
      onParticipantsChange(selectedParticipants.map(p => p.id));
    }
  }, [selectedParticipants]); // Remove callbacks from dependencies to prevent loops

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
    const participant = participants.find(p => p.id === participantId);
    if (participant && !selectedParticipants.find(sp => sp.id === participantId)) {
      setSelectedParticipants(prev => [...prev, {
        id: participant.id,
        email: participant.email,
        role: participant.role,
        autoEnroll: autoEnrollAll
      }]);
      setSelectValue('');
    }
  };

  const handleRemoveParticipant = (participantId: UserId) => {
    setSelectedParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  const handleToggleAutoEnroll = (participantId: UserId) => {
    setSelectedParticipants(prev =>
      prev.map(p => p.id === participantId ? { ...p, autoEnroll: !p.autoEnroll } : p)
    );
  };

  const handleToggleAllAutoEnroll = (checked: boolean) => {
    setAutoEnrollAll(checked);
    setSelectedParticipants(prev =>
      prev.map(p => ({ ...p, autoEnroll: checked }))
    );
  };

  const getAvailableParticipants = () => {
    const selectedIds = selectedParticipants.map(p => p.id);
    return participants.filter(p => !selectedIds.includes(p.id));
  };

  const invitedCount = selectedParticipants.filter(p => !p.autoEnroll).length;
  const enrolledCount = selectedParticipants.filter(p => p.autoEnroll).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Participant Management
        </Label>

        {selectedParticipants.length > 0 && (
          <div className="flex items-center space-x-2">
            <Label className="text-sm text-gray-600">
              Invite and Enroll All
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1">
                    <Switch
                      checked={autoEnrollAll}
                      onCheckedChange={handleToggleAllAutoEnroll}
                      disabled={disabled}
                    />
                    <Info className="h-3 w-3 text-gray-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    <strong>ON:</strong> Participants are automatically enrolled and can participate immediately.<br/>
                    <strong>OFF:</strong> Participants receive invitations and must accept to join.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <div className="flex-1">
          <Select
            value={selectValue}
            onValueChange={(value) => {
              setSelectValue(value);
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
                    : "Select participants to add"
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

      {selectedParticipants.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600 flex items-center">
            <Users className="h-4 w-4 mr-1" />
            Selected participants ({selectedParticipants.length})
          </div>

          <div className="space-y-2">
            {selectedParticipants.map((participant) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-3 rounded-md border ${
                  participant.autoEnroll
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex items-center space-x-2">
                    {participant.autoEnroll ? (
                      <UserCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <UserPlus className="h-4 w-4 text-amber-600" />
                    )}
                    <div>
                      <span className="text-sm font-medium">{participant.email}</span>
                      <span className="text-xs text-gray-500 ml-2">({participant.role})</span>
                    </div>
                  </div>

                  <span className={`text-xs px-2 py-1 rounded ${
                    participant.autoEnroll
                      ? 'text-green-700 bg-green-200'
                      : 'text-amber-700 bg-amber-200'
                  }`}>
                    {participant.autoEnroll ? 'Will be enrolled' : 'Will be invited'}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Label
                      className="text-xs text-gray-600 cursor-pointer"
                    >
                      Invite & Enroll
                    </Label>
                    <Switch
                      checked={participant.autoEnroll}
                      onCheckedChange={() => handleToggleAutoEnroll(participant.id)}
                      disabled={disabled}
                    />
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {selectedParticipants.length > 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
          <div className="space-y-1">
            {invitedCount > 0 && (
              <div className="flex items-center space-x-1">
                <UserPlus className="h-3 w-3" />
                <span><strong>{invitedCount}</strong> participant{invitedCount === 1 ? '' : 's'} will receive invitation{invitedCount === 1 ? '' : 's'} and must accept to join</span>
              </div>
            )}
            {enrolledCount > 0 && (
              <div className="flex items-center space-x-1">
                <UserCheck className="h-3 w-3" />
                <span><strong>{enrolledCount}</strong> participant{enrolledCount === 1 ? '' : 's'} will be automatically enrolled</span>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedParticipants.length === 0 && (
        <div className="text-xs text-gray-500">
          Select participants and choose whether to invite them (they must accept) or invite & enroll them (automatic).
        </div>
      )}
    </div>
  );
}
