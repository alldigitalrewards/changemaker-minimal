'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Plus, Clock, Users, Trophy, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ActivityTemplateSelector } from './activity-template-selector';
import { ActivityType } from '@/lib/types';
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
          <div className="animate-spin h-8 w-8 border-b-2 border-coral-500 rounded-full"></div>
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
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Assign Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Assign Activity to Challenge</DialogTitle>
                <DialogDescription>
                  Select an activity template and configure it for this challenge
                </DialogDescription>
              </DialogHeader>
              <ActivityTemplateSelector
                challengeId={challengeId}
                workspaceSlug={workspaceSlug}
                onAssigned={handleActivityAssigned}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No activities assigned to this challenge yet</p>
            <p className="text-sm text-gray-400 mb-6">
              Assign activities from your templates to give participants tasks to complete
            </p>
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Your First Activity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Assign Activity to Challenge</DialogTitle>
                  <DialogDescription>
                    Select an activity template and configure it for this challenge
                  </DialogDescription>
                </DialogHeader>
                <ActivityTemplateSelector
                  challengeId={challengeId}
                  workspaceSlug={workspaceSlug}
                  onAssigned={handleActivityAssigned}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-lg">{activity.template.name}</h3>
                      <Badge variant={getActivityTypeVariant(activity.template.type)}>
                        {getActivityTypeLabel(activity.template.type)}
                      </Badge>
                      {activity.isRequired && (
                        <Badge variant="destructive">Required</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{activity.template.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span className="font-medium">{activity.pointsValue} points</span>
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
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button variant="outline" size="sm" disabled>
                      Edit
                    </Button>
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}