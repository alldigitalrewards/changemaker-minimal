'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Users, X, UserPlus, UserCheck, Info, Search, ArrowRightLeft, Trash2, CheckSquare, Square } from 'lucide-react';
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
  const hasInitialized = useRef(false);
  const [availableQuery, setAvailableQuery] = useState('');
  const [invitedQuery, setInvitedQuery] = useState('');
  const [enrolledQuery, setEnrolledQuery] = useState('');
  const [invitedSelected, setInvitedSelected] = useState<Set<string>>(new Set());
  const [enrolledSelected, setEnrolledSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (workspaceSlug) {
      fetchParticipants();
    }
  }, [workspaceSlug]);

  // Initialize from props only once when participants are loaded
  useEffect(() => {
    // Skip if already initialized
    if (hasInitialized.current) {
      return;
    }

    // Skip if participants haven't loaded yet
    if (participants.length === 0) {
      return;
    }

    // Skip if there are no initial IDs to process
    if (initialInvitedIds.length === 0 && initialEnrolledIds.length === 0) {
      return;
    }

    hasInitialized.current = true;

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
      if (participant && !initialSelected.find(p => p.id === id)) {
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
  }, [participants.length]); // Only depend on participants being loaded

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
    const base = participants.filter(p => !selectedIds.includes(p.id));
    if (!availableQuery.trim()) return base;
    const q = availableQuery.toLowerCase();
    return base.filter(p => p.email.toLowerCase().includes(q));
  };

  const invited = selectedParticipants.filter(p => !p.autoEnroll);
  const enrolled = selectedParticipants.filter(p => p.autoEnroll);
  const invitedCount = invited.length;
  const enrolledCount = enrolled.length;

  const filteredInvited = invited.filter(p => !invitedQuery || p.email.toLowerCase().includes(invitedQuery.toLowerCase()));
  const filteredEnrolled = enrolled.filter(p => !enrolledQuery || p.email.toLowerCase().includes(enrolledQuery.toLowerCase()));

  const toggleInvitedSelection = (id: string) => {
    setInvitedSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleEnrolledSelection = (id: string) => {
    setEnrolledSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllInvited = () => setInvitedSelected(new Set(filteredInvited.map(p => p.id)));
  const clearInvitedSelection = () => setInvitedSelected(new Set());
  const selectAllEnrolled = () => setEnrolledSelected(new Set(filteredEnrolled.map(p => p.id)));
  const clearEnrolledSelection = () => setEnrolledSelected(new Set());

  const moveInvitedToEnrolled = () => {
    if (invitedSelected.size === 0) return;
    setSelectedParticipants(prev => prev.map(p => invitedSelected.has(p.id) ? { ...p, autoEnroll: true } : p));
    clearInvitedSelection();
  };
  const moveEnrolledToInvited = () => {
    if (enrolledSelected.size === 0) return;
    setSelectedParticipants(prev => prev.map(p => enrolledSelected.has(p.id) ? { ...p, autoEnroll: false } : p));
    clearEnrolledSelection();
  };
  const removeSelectedFromInvited = () => {
    if (invitedSelected.size === 0) return;
    setSelectedParticipants(prev => prev.filter(p => !invitedSelected.has(p.id)));
    clearInvitedSelection();
  };
  const removeSelectedFromEnrolled = () => {
    if (enrolledSelected.size === 0) return;
    setSelectedParticipants(prev => prev.filter(p => !enrolledSelected.has(p.id)));
    clearEnrolledSelection();
  };

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

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={availableQuery}
              onChange={(e) => setAvailableQuery(e.target.value)}
              placeholder="Search available participants"
              disabled={disabled || isLoading}
            />
            <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
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
                      : "Add participant"
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
      </div>

      {selectedParticipants.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Invited Column */}
          <div className="border rounded-md p-3 bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-600" /> Invited ({invitedCount})
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" type="button" onClick={selectAllInvited} disabled={filteredInvited.length === 0 || disabled}>
                  <CheckSquare className="h-3 w-3 mr-1" /> All
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={clearInvitedSelection} disabled={invitedSelected.size === 0 || disabled}>
                  <Square className="h-3 w-3 mr-1" /> None
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={moveInvitedToEnrolled} disabled={invitedSelected.size === 0 || disabled}>
                  <ArrowRightLeft className="h-3 w-3 mr-1" /> Enroll
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={removeSelectedFromInvited} disabled={invitedSelected.size === 0 || disabled}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            </div>
            <div className="relative mb-2">
              <Input value={invitedQuery} onChange={(e) => setInvitedQuery(e.target.value)} placeholder="Filter invited" disabled={disabled} />
              <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {filteredInvited.map((p) => (
                <label key={p.id} className="flex items-center justify-between p-2 rounded-md bg-white border">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4" checked={invitedSelected.has(p.id)} onChange={() => toggleInvitedSelection(p.id)} disabled={disabled} />
                    <span className="text-sm">{p.email}</span>
                    <span className="text-xs text-gray-500">({p.role})</span>
                  </div>
                  <Button variant="ghost" size="sm" type="button" onClick={() => handleToggleAutoEnroll(p.id)} disabled={disabled}>
                    <ArrowRightLeft className="h-3 w-3 mr-1" /> Enroll
                  </Button>
                </label>
              ))}
              {filteredInvited.length === 0 && (
                <div className="text-xs text-gray-500">No invited participants</div>
              )}
            </div>
          </div>

          {/* Enrolled Column */}
          <div className="border rounded-md p-3 bg-green-50 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" /> Enrolled ({enrolledCount})
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" type="button" onClick={selectAllEnrolled} disabled={filteredEnrolled.length === 0 || disabled}>
                  <CheckSquare className="h-3 w-3 mr-1" /> All
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={clearEnrolledSelection} disabled={enrolledSelected.size === 0 || disabled}>
                  <Square className="h-3 w-3 mr-1" /> None
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={moveEnrolledToInvited} disabled={enrolledSelected.size === 0 || disabled}>
                  <ArrowRightLeft className="h-3 w-3 mr-1" /> Invite
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={removeSelectedFromEnrolled} disabled={enrolledSelected.size === 0 || disabled}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            </div>
            <div className="relative mb-2">
              <Input value={enrolledQuery} onChange={(e) => setEnrolledQuery(e.target.value)} placeholder="Filter enrolled" disabled={disabled} />
              <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {filteredEnrolled.map((p) => (
                <label key={p.id} className="flex items-center justify-between p-2 rounded-md bg-white border">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4" checked={enrolledSelected.has(p.id)} onChange={() => toggleEnrolledSelection(p.id)} disabled={disabled} />
                    <span className="text-sm">{p.email}</span>
                    <span className="text-xs text-gray-500">({p.role})</span>
                  </div>
                  <Button variant="ghost" size="sm" type="button" onClick={() => handleToggleAutoEnroll(p.id)} disabled={disabled}>
                    <ArrowRightLeft className="h-3 w-3 mr-1" /> Invite
                  </Button>
                </label>
              ))}
              {filteredEnrolled.length === 0 && (
                <div className="text-xs text-gray-500">No enrolled participants</div>
              )}
            </div>
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
