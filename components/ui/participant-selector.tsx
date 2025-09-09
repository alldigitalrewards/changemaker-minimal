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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, X, UserPlus, UserCheck } from 'lucide-react';
import type { WorkspaceParticipant, UserId } from '@/lib/types';

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
  const [invitedIds, setInvitedIds] = useState<UserId[]>(initialInvitedIds);
  const [enrolledIds, setEnrolledIds] = useState<UserId[]>(initialEnrolledIds);
  const [invitedSelectValue, setInvitedSelectValue] = useState('');
  const [enrolledSelectValue, setEnrolledSelectValue] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (workspaceSlug) {
      fetchParticipants();
    }
  }, [workspaceSlug]);

  // Sync with parent component if using legacy single-tab mode
  useEffect(() => {
    if (!onParticipantDataChange) {
      // Legacy mode: use selectedParticipantIds as invited
      setInvitedIds(selectedParticipantIds);
    }
  }, [selectedParticipantIds, onParticipantDataChange]);

  // Notify parent of changes in two-tab mode
  useEffect(() => {
    if (onParticipantDataChange) {
      onParticipantDataChange({ invited: invitedIds, enrolled: enrolledIds });
    } else {
      // Legacy mode: sync back to parent
      onParticipantsChange(invitedIds);
    }
  }, [invitedIds, enrolledIds, onParticipantDataChange, onParticipantsChange]);

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

  const handleAddInvited = (participantId: string) => {
    if (participantId && !invitedIds.includes(participantId) && !enrolledIds.includes(participantId)) {
      setInvitedIds(prev => [...prev, participantId]);
      setInvitedSelectValue('');
    }
  };

  const handleAddEnrolled = (participantId: string) => {
    if (participantId && !enrolledIds.includes(participantId) && !invitedIds.includes(participantId)) {
      setEnrolledIds(prev => [...prev, participantId]);
      setEnrolledSelectValue('');
    }
  };

  const handleRemoveInvited = (participantId: UserId) => {
    setInvitedIds(prev => prev.filter(id => id !== participantId));
  };

  const handleRemoveEnrolled = (participantId: UserId) => {
    setEnrolledIds(prev => prev.filter(id => id !== participantId));
  };

  const getParticipantsByIds = (ids: UserId[]) => {
    return participants.filter(p => ids.includes(p.id));
  };

  const getAvailableParticipants = () => {
    const usedIds = [...invitedIds, ...enrolledIds];
    return participants.filter(p => !usedIds.includes(p.id));
  };

  // Use two-tab mode if callback is provided, otherwise legacy single-tab
  const useTwoTabMode = !!onParticipantDataChange;

  if (!useTwoTabMode) {
    // Legacy single-tab mode
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Invite Participants (Optional)
        </Label>
        
        <div className="flex space-x-2">
          <div className="flex-1">
            <Select 
              value={invitedSelectValue} 
              onValueChange={(value) => {
                setInvitedSelectValue(value);
                handleAddInvited(value);
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

        {invitedIds.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-1" />
              Selected participants ({invitedIds.length})
            </div>
            <div className="space-y-1">
              {getParticipantsByIds(invitedIds).map((participant) => (
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
                    onClick={() => handleRemoveInvited(participant.id)}
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

        <div className="text-xs text-gray-500">
          {invitedIds.length === 0 
            ? "Participants will be invited and need to accept to join the challenge."
            : `${invitedIds.length} participant${invitedIds.length === 1 ? '' : 's'} will be invited to this challenge.`
          }
        </div>
      </div>
    );
  }

  // Two-tab mode
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        Participant Management
      </Label>

      <Tabs defaultValue="invited" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invited" className="flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Invited ({invitedIds.length})</span>
          </TabsTrigger>
          <TabsTrigger value="enrolled" className="flex items-center space-x-2">
            <UserCheck className="h-4 w-4" />
            <span>Enrolled ({enrolledIds.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invited" className="space-y-3">
          <div className="space-y-2">
            <div className="text-sm text-coral-600 font-medium">Invite Participants</div>
            <div className="text-xs text-gray-500 mb-2">
              Invited participants will receive a notification and must manually accept to join the challenge.
            </div>
            
            <Select 
              value={invitedSelectValue} 
              onValueChange={(value) => {
                setInvitedSelectValue(value);
                handleAddInvited(value);
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

            {invitedIds.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 flex items-center">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Participants to invite ({invitedIds.length})
                </div>
                <div className="space-y-1">
                  {getParticipantsByIds(invitedIds).map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2 rounded-md"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{participant.email}</span>
                        <span className="text-xs text-amber-700 bg-amber-200 px-2 py-1 rounded">
                          Will be invited
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveInvited(participant.id)}
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
          </div>
        </TabsContent>

        <TabsContent value="enrolled" className="space-y-3">
          <div className="space-y-2">
            <div className="text-sm text-coral-600 font-medium">Auto-Enroll Participants</div>
            <div className="text-xs text-gray-500 mb-2">
              Enrolled participants will be automatically added to the challenge and can participate immediately.
            </div>
            
            <Select 
              value={enrolledSelectValue} 
              onValueChange={(value) => {
                setEnrolledSelectValue(value);
                handleAddEnrolled(value);
              }}
              disabled={disabled || isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoading 
                    ? "Loading participants..." 
                    : getAvailableParticipants().length === 0 
                      ? "No participants available"
                      : "Select a participant to enroll"
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

            {enrolledIds.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 flex items-center">
                  <UserCheck className="h-4 w-4 mr-1" />
                  Participants to enroll ({enrolledIds.length})
                </div>
                <div className="space-y-1">
                  {getParticipantsByIds(enrolledIds).map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between bg-green-50 border border-green-200 p-2 rounded-md"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{participant.email}</span>
                        <span className="text-xs text-green-700 bg-green-200 px-2 py-1 rounded">
                          Will be enrolled
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEnrolled(participant.id)}
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
        <div className="space-y-1">
          <div>• <strong>Invited:</strong> {invitedIds.length} participant{invitedIds.length === 1 ? '' : 's'} will receive invitations</div>
          <div>• <strong>Enrolled:</strong> {enrolledIds.length} participant{enrolledIds.length === 1 ? '' : 's'} will be automatically enrolled</div>
        </div>
      </div>
    </div>
  );
}