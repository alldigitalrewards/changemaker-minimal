'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Activity, Plus, Clock, Users, Trophy, Settings, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ActivityAddDialog } from './ActivityAddDialog';
import ActivityAddInline from './ActivityAddInline';
import { ActivityType, type RewardType } from '@/lib/types';
import { formatRewardValue, getRewardLabelShort, getRewardUnit } from '@/lib/reward-utils';
import { format } from 'date-fns';

interface ActivityWithTemplate {
  id: string;
  templateId: string;
  challengeId: string;
  pointsValue: number;
  maxSubmissions: number;
  deadline: Date | null;
  isRequired: boolean;
  template: {
    id: string;
    name: string;
    description: string;
    type: ActivityType;
    basePoints: number;
    rewardType?: RewardType;
    requiresApproval: boolean;
    allowMultiple: boolean;
  };
}

interface ChallengeActivitiesProps {
  challengeId: string;
  workspaceSlug: string;
}

export function ChallengeActivities({ challengeId, workspaceSlug }: ChallengeActivitiesProps) {
  const [activities, setActivities] = useState<ActivityWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<ActivityWithTemplate> | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkPoints, setBulkPoints] = useState<string>('')
  const [bulkMax, setBulkMax] = useState<string>('')
  const [bulkRequired, setBulkRequired] = useState<boolean | null>(null)
  const [showInlineAdd, setShowInlineAdd] = useState(false)
  const canApplyBulk = selectedIds.length > 0 && ((bulkPoints.trim() !== '') || (bulkMax.trim() !== '') || (bulkRequired !== null))
  const clearBulk = () => { setSelectedIds([]); setBulkPoints(''); setBulkMax(''); setBulkRequired(null); }

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceSlug}/challenges/${challengeId}/activities`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [challengeId, workspaceSlug]);

  const handleActivityAssigned = () => {
    setIsAssignDialogOpen(false);
    fetchActivities(); // Refresh the activities list
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to remove this activity from the challenge?')) {
      return;
    }

    setDeletingActivityId(activityId);
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/challenges/${challengeId}/activities/${activityId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }

      fetchActivities(); // Refresh the list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete activity');
    } finally {
      setDeletingActivityId(null);
    }
  };

  const beginEdit = (a: ActivityWithTemplate) => {
    setEditingId(a.id)
    setEditDraft({
      id: a.id,
      pointsValue: a.pointsValue,
      maxSubmissions: a.maxSubmissions,
      deadline: a.deadline ? new Date(a.deadline) : null,
      isRequired: a.isRequired
    })
  }

  const saveEdit = async () => {
    if (!editingId || !editDraft) return
    setSavingId(editingId)
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/challenges/${challengeId}/activities/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointsValue: editDraft.pointsValue,
          maxSubmissions: editDraft.maxSubmissions,
          deadline: editDraft.deadline ? new Date(editDraft.deadline as any).toISOString() : null,
          isRequired: editDraft.isRequired
        })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to save activity')
      }
      setEditingId(null)
      setEditDraft(null)
      fetchActivities()
    } catch (e: any) {
      alert(e.message || 'Failed to save')
    } finally {
      setSavingId(null)
    }
  }

  const patchActivity = async (id: string, body: any) => {
    const res = await fetch(`/api/workspaces/${workspaceSlug}/challenges/${challengeId}/activities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.error || 'Failed to save activity')
    }
  }

  const applyBulkUpdates = async () => {
    if (selectedIds.length === 0) return
    try {
      for (const id of selectedIds) {
        const body: any = {}
        if (bulkPoints.trim() !== '') body.pointsValue = Math.max(1, parseInt(bulkPoints) || 1)
        if (bulkMax.trim() !== '') body.maxSubmissions = Math.max(1, parseInt(bulkMax) || 1)
        if (bulkRequired !== null) body.isRequired = bulkRequired
        if (Object.keys(body).length > 0) {
          await patchActivity(id, body)
        }
      }
      setSelectedIds([])
      setBulkPoints('')
      setBulkMax('')
      setBulkRequired(null)
      fetchActivities()
    } catch (e: any) {
      alert(e.message || 'Failed to apply bulk changes')
    }
  }

  const getActivityTypeLabel = (type: ActivityType) => {
    switch (type) {
      case 'TEXT_SUBMISSION': return 'Text';
      case 'FILE_UPLOAD': return 'File';
      case 'PHOTO_UPLOAD': return 'Photo';
      case 'LINK_SUBMISSION': return 'Link';
      case 'MULTIPLE_CHOICE': return 'Quiz';
      case 'VIDEO_SUBMISSION': return 'Video';
      default: return type;
    }
  };

  const getActivityTypeVariant = (type: ActivityType): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'TEXT_SUBMISSION': return 'default';
      case 'FILE_UPLOAD': return 'secondary';
      case 'PHOTO_UPLOAD': return 'outline';
      case 'LINK_SUBMISSION': return 'secondary';
      case 'MULTIPLE_CHOICE': return 'default';
      case 'VIDEO_SUBMISSION': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-red-600 mb-4">Error loading activities: {error}</p>
          <Button onClick={fetchActivities}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Challenge Activities</CardTitle>
            <CardDescription>
              {activities.length === 0 
                ? 'Assign activity templates to this challenge to engage participants'
                : `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'} assigned to this challenge`
              }
            </CardDescription>
          </div>
          <Button onClick={(e) => { e.preventDefault(); setShowInlineAdd(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showInlineAdd && (
          <div className="mb-4">
            <ActivityAddInline
              workspaceSlug={workspaceSlug}
              challengeId={challengeId}
              mode="api"
              onAdd={() => handleActivityAssigned()}
              onClose={() => setShowInlineAdd(false)}
              onAssigned={() => handleActivityAssigned()}
            />
          </div>
        )}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-3 border rounded-lg bg-white/80 backdrop-blur sticky top-0 z-10 flex items-center gap-3 shadow-sm">
            <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{selectedIds.length} selected</div>
            <Input
              placeholder="Points"
              value={bulkPoints}
              onChange={(e) => setBulkPoints(e.target.value)}
              className="w-24 h-8"
              type="number"
              min={1}
            />
            <Input
              placeholder="Max"
              value={bulkMax}
              onChange={(e) => setBulkMax(e.target.value)}
              className="w-20 h-8"
              type="number"
              min={1}
            />
            <div className="flex items-center gap-2 ml-2">
              <Checkbox id="bulk-required" checked={bulkRequired === true} onCheckedChange={(v) => setBulkRequired(v ? true : null)} />
              <label htmlFor="bulk-required" className="text-sm">Required</label>
              <Button variant="outline" size="sm" onClick={() => setBulkRequired(false)}>Set Optional</Button>
            </div>
            <div className="flex-1" />
            <Button size="sm" onClick={applyBulkUpdates} disabled={!canApplyBulk}>Apply</Button>
            <Button size="sm" variant="outline" onClick={clearBulk}>Clear</Button>
          </div>
        )}
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No activities assigned to this challenge yet</p>
            <p className="text-sm text-gray-400 mb-6">
              Assign activities from your templates to give participants tasks to complete
            </p>
            <ActivityAddDialog
              mode="api"
              workspaceSlug={workspaceSlug}
              challengeId={challengeId}
              onAdd={() => handleActivityAssigned()}
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Activity
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Checkbox
                id="select-all"
                checked={selectedIds.length > 0 && selectedIds.length === activities.length}
                onCheckedChange={(v) => setSelectedIds(v ? activities.map(a => a.id) : [])}
              />
              <label htmlFor="select-all">Select all</label>
            </div>
            {activities.map((activity) => {
              const activityRewardType: RewardType = activity.template.rewardType ?? 'points'
              const activityRewardLabel = getRewardLabelShort(activityRewardType)
              const activityRewardUnit = getRewardUnit(activityRewardType)
              const activityRewardDisplay = formatRewardValue(activityRewardType, activity.pointsValue)
              const activityRewardSummary = activityRewardUnit ? `${activityRewardDisplay} ${activityRewardUnit}` : activityRewardDisplay

              return (
                <div
                  key={activity.id}
                  className={`border rounded-lg p-4 transition hover:bg-gray-50 ${selectedIds.includes(activity.id) ? 'ring-1 ring-amber-300' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          checked={selectedIds.includes(activity.id)}
                          onCheckedChange={(v) => setSelectedIds(prev => v ? Array.from(new Set([...prev, activity.id])) : prev.filter(id => id !== activity.id))}
                          className="mr-1"
                        />
                        <h3 className="font-semibold text-lg">{activity.template.name}</h3>
                        <Badge variant={getActivityTypeVariant(activity.template.type)}>
                          {getActivityTypeLabel(activity.template.type)}
                        </Badge>
                        {(editingId ? editDraft?.isRequired : activity.isRequired) && (
                          <Badge variant="destructive">Required</Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{activity.template.description}</p>

                      {editingId === activity.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Reward Amount ({activityRewardLabel})</label>
                            <input
                              className="w-full border rounded px-2 py-1"
                              type="number"
                              min={1}
                              value={editDraft?.pointsValue ?? activity.pointsValue}
                              onChange={(e) => setEditDraft(d => ({ ...d!, pointsValue: parseInt(e.target.value) || 1 }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Max submissions</label>
                            <input
                              className="w-full border rounded px-2 py-1"
                              type="number"
                              min={1}
                              value={editDraft?.maxSubmissions ?? activity.maxSubmissions}
                              onChange={(e) => setEditDraft(d => ({ ...d!, maxSubmissions: parseInt(e.target.value) || 1 }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Deadline</label>
                            <input
                              className="w-full border rounded px-2 py-1"
                              type="datetime-local"
                              value={editDraft?.deadline ? new Date(editDraft.deadline as any).toISOString().slice(0,16) : ''}
                              onChange={(e) => setEditDraft(d => ({ ...d!, deadline: e.target.value ? new Date(e.target.value) : null }))}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              id={`req-${activity.id}`}
                              type="checkbox"
                              checked={!!editDraft?.isRequired}
                              onChange={(e) => setEditDraft(d => ({ ...d!, isRequired: e.target.checked }))}
                            />
                            <label htmlFor={`req-${activity.id}`}>Required</label>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            <span className="font-medium">{activityRewardSummary}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span>Max {activity.maxSubmissions} submission{activity.maxSubmissions !== 1 ? 's' : ''}</span>
                          </div>
                          {activity.deadline && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4 text-red-500" />
                              <span>Due {format(new Date(activity.deadline), 'MMM d')}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Settings className="h-4 w-4 text-gray-500" />
                            <span>{activity.template.requiresApproval ? 'Needs approval' : 'Auto-approve'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      {editingId === activity.id ? (
                        <Button variant="outline" size="sm" onClick={saveEdit} disabled={savingId === activity.id}>
                          {savingId === activity.id ? 'Saving…' : (<><Save className="h-4 w-4 mr-1" />Save</>)}
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => beginEdit(activity)}>
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteActivity(activity.id)}
                        disabled={deletingActivityId === activity.id}
                      >
                        {deletingActivityId === activity.id ? 'Removing...' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
