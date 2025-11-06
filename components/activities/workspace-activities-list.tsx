'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActivityDetailDialog } from './activity-detail-dialog';
import { Calendar, Users, Coins, Clock, CheckCircle, XCircle, AlertTriangle, Trophy, ExternalLink, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Challenge {
  id: string;
  title: string;
  description: string;
  startDate: string | Date;
  endDate: string | Date;
  status: string;
  rewardType?: 'points' | 'sku' | 'monetary';
  _count?: {
    enrollments: number;
  };
}

interface ActivityTemplate {
  id: string;
  name: string;
  description: string | null;
  submissionType: string;
}

interface Activity {
  id: string;
  pointsValue: number;
  maxSubmissions: number | null;
  deadline: string | Date | null;
  isRequired: boolean;
  ActivityTemplate: ActivityTemplate;
}

interface ChallengeWithActivities {
  challenge: Challenge;
  activities: Activity[];
}

interface WorkspaceActivitiesListProps {
  activitiesByChallenge: ChallengeWithActivities[];
  workspaceSlug: string;
  onUpdate?: () => void;
}

export function WorkspaceActivitiesList({
  activitiesByChallenge,
  workspaceSlug,
  onUpdate,
}: WorkspaceActivitiesListProps) {
  const router = useRouter();
  const [selectedActivity, setSelectedActivity] = useState<{
    activity: Activity;
    challenge: Challenge;
  } | null>(null);

  const getStatusBadge = (challenge: Challenge) => {
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

  const getRewardTypeBadge = (rewardType: 'points' | 'sku' | 'monetary') => {
    switch (rewardType) {
      case 'points':
        return { label: 'Points', icon: Coins, className: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'sku':
        return { label: 'SKU Rewards', icon: ShoppingCart, className: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'monetary':
        return { label: 'Monetary', icon: Coins, className: 'bg-green-100 text-green-800 border-green-300' };
    }
  };

  const handleChallengeClick = (challengeId: string) => {
    router.push(`/w/${workspaceSlug}/admin/challenges/${challengeId}`);
  };

  if (activitiesByChallenge.every((g) => g.activities.length === 0)) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-600">
          No activities yet. Create activities from a challenge.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {activitiesByChallenge.map(({ challenge, activities }) =>
          activities.length > 0 ? (
            <Card key={challenge.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-coral-50 to-terracotta-50 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-coral-600" />
                        {challenge.title}
                      </CardTitle>
                      {(() => {
                        const status = getStatusBadge(challenge);
                        const StatusIcon = status.icon;
                        return (
                          <Badge variant={status.variant} className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        );
                      })()}
                      {challenge.rewardType && (() => {
                        const rewardBadge = getRewardTypeBadge(challenge.rewardType);
                        const RewardIcon = rewardBadge.icon;
                        return (
                          <Badge variant="outline" className={`flex items-center gap-1 ${rewardBadge.className}`}>
                            <RewardIcon className="h-3 w-3" />
                            {rewardBadge.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <CardDescription className="text-gray-700">
                      {challenge.description}
                    </CardDescription>
                  </div>
                  <button
                    onClick={() => handleChallengeClick(challenge.id)}
                    className="ml-4 flex items-center gap-2 px-3 py-1.5 text-sm text-coral-700 hover:text-coral-800 hover:bg-white/50 rounded-md transition-colors"
                  >
                    <span className="font-medium">View Challenge</span>
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(challenge.startDate), 'MMM d')} -{' '}
                      {format(new Date(challenge.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{challenge._count?.enrollments || 0} enrolled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4" />
                    <span>{activities.length} activities</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activities.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedActivity({ activity: a, challenge })}
                      className="border rounded-lg p-4 hover:border-coral-300 hover:shadow-md transition-all text-left bg-white group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-gray-900 group-hover:text-coral-700 transition-colors flex-1">
                          {a.ActivityTemplate.name}
                        </div>
                        {a.isRequired && (
                          <Badge variant="default" className="ml-2 text-xs">
                            Required
                          </Badge>
                        )}
                      </div>

                      {a.ActivityTemplate.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {a.ActivityTemplate.description}
                        </p>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Coins className="h-4 w-4 text-amber-600" />
                          <span className="font-medium text-gray-900">{a.pointsValue} points</span>
                        </div>

                        {a.deadline && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Due: {format(new Date(a.deadline), 'MMM d, h:mm a')}</span>
                          </div>
                        )}

                        {a.maxSubmissions && (
                          <div className="text-xs text-gray-500">
                            Max {a.maxSubmissions} submission{a.maxSubmissions > 1 ? 's' : ''}
                          </div>
                        )}

                        <div className="pt-2 border-t">
                          <Badge variant="outline" className="text-xs">
                            {a.ActivityTemplate.submissionType}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null
        )}
      </div>

      {selectedActivity && (
        <ActivityDetailDialog
          activity={selectedActivity.activity}
          challenge={selectedActivity.challenge}
          workspaceSlug={workspaceSlug}
          open={!!selectedActivity}
          onOpenChange={(open) => {
            if (!open) setSelectedActivity(null);
          }}
          onUpdate={() => {
            if (onUpdate) {
              onUpdate();
            }
            setSelectedActivity(null);
          }}
        />
      )}
    </>
  );
}
