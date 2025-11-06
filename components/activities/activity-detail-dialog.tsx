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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Trophy,
  Users,
  ExternalLink,
  Save,
  X,
  Coins,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface Challenge {
  id: string;
  title: string;
  description: string;
  startDate: string | Date;
  endDate: string | Date;
  status: string;
  rewardType: 'points' | 'sku' | 'monetary' | null;
  _count?: {
    Enrollment: number;
  };
}

interface ActivityTemplate {
  id: string;
  name: string;
  description: string | null;
  type: string;
  rewardType: 'points' | 'sku' | 'monetary' | null;
  rewardConfig?: any;
}

interface Activity {
  id: string;
  pointsValue: number;
  maxSubmissions: number | null;
  deadline: string | Date | null;
  isRequired: boolean;
  ActivityTemplate: ActivityTemplate;
}

interface ActivityDetailDialogProps {
  activity: Activity;
  challenge: Challenge;
  workspaceSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ActivityDetailDialog({
  activity,
  challenge,
  workspaceSlug,
  open,
  onOpenChange,
  onUpdate,
}: ActivityDetailDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    pointsValue: activity.pointsValue,
    maxSubmissions: activity.maxSubmissions || '',
    deadline: activity.deadline
      ? format(new Date(activity.deadline), "yyyy-MM-dd'T'HH:mm")
      : '',
    isRequired: activity.isRequired,
  });

  const getStatusBadge = () => {
    const now = new Date();
    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);

    if (challenge.status === 'ARCHIVED') {
      return { label: 'ARCHIVED', variant: 'secondary' as const, icon: XCircle };
    }
    if (challenge.status !== 'PUBLISHED') {
      return { label: 'DRAFT', variant: 'outline' as const, icon: AlertTriangle };
    }
    if (now < start) {
      return { label: 'UPCOMING', variant: 'outline' as const, icon: Clock };
    }
    if (now >= start && now <= end) {
      return { label: 'ACTIVE', variant: 'default' as const, icon: CheckCircle };
    }
    return { label: 'ENDED', variant: 'secondary' as const, icon: XCircle };
  };

  const status = getStatusBadge();
  const StatusIcon = status.icon;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/challenges/${challenge.id}/activities/${activity.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pointsValue: Number(formData.pointsValue),
            maxSubmissions: formData.maxSubmissions ? Number(formData.maxSubmissions) : null,
            deadline: formData.deadline || null,
            isRequired: formData.isRequired,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update activity');
      }

      toast({
        title: 'Success',
        description: 'Activity updated successfully',
      });

      setIsEditing(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update activity',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      pointsValue: activity.pointsValue,
      maxSubmissions: activity.maxSubmissions || '',
      deadline: activity.deadline
        ? format(new Date(activity.deadline), "yyyy-MM-dd'T'HH:mm")
        : '',
      isRequired: activity.isRequired,
    });
    setIsEditing(false);
  };

  const navigateToChallenge = () => {
    router.push(`/w/${workspaceSlug}/admin/challenges/${challenge.id}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-coral-600" />
            {activity.ActivityTemplate.name}
          </DialogTitle>
          <DialogDescription>
            {activity.ActivityTemplate.description || 'View and edit activity details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Challenge Context Section */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{challenge.title}</h3>
                  <Badge variant={status.variant} className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{challenge.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(challenge.startDate), 'MMM d')} - {format(new Date(challenge.endDate), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span>{challenge._count?.Enrollment || 0} enrolled</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={navigateToChallenge}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Challenge
            </Button>
          </div>

          <Separator />

          {/* Activity Details Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Activity Details</h3>

            {!isEditing ? (
              <>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-600 text-sm">Points Value</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Coins className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-lg text-gray-900">{activity.pointsValue}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-600 text-sm">Max Submissions</Label>
                      <div className="mt-2">
                        <span className="font-semibold text-lg text-gray-900">
                          {activity.maxSubmissions || 'Unlimited'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-600 text-sm">Submission Type</Label>
                      <div className="mt-2">
                        <Badge variant="outline" className="font-medium">
                          {activity.ActivityTemplate.type}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-600 text-sm">Required Activity</Label>
                      <div className="mt-2">
                        <Badge variant={activity.isRequired ? 'default' : 'secondary'} className="font-medium">
                          {activity.isRequired ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {activity.deadline && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-gray-600 text-sm">Deadline</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-gray-900">
                            {format(new Date(activity.deadline), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Button onClick={() => setIsEditing(true)} className="w-full mt-6">
                  Edit Activity
                </Button>
              </>
            ) : (
              <>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="pointsValue">Points Value</Label>
                    <Input
                      id="pointsValue"
                      type="number"
                      min="0"
                      value={formData.pointsValue}
                      onChange={(e) => setFormData({ ...formData, pointsValue: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxSubmissions">Max Submissions (optional)</Label>
                    <Input
                      id="maxSubmissions"
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={formData.maxSubmissions}
                      onChange={(e) => setFormData({ ...formData, maxSubmissions: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="deadline">Deadline (optional)</Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isRequired"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isRequired" className="cursor-pointer">
                      Mark as required activity
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="animate-pulse">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
