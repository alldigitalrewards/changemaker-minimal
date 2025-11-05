import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Calendar,
  Users,
  Trophy,
  Clock,
  Target,
  CheckCircle,
  Star,
  Award,
  AlertCircle,
  Activity,
  TrendingUp,
  FileText,
  BarChart3,
  Crown,
  Medal
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { prisma } from '@/lib/db';
import { getCurrentUser, requireWorkspaceAccessCanonical } from '@/lib/auth/session';
import type { ChallengeStatus } from '@/lib/auth/types'
import { getChallengeLeaderboard } from '@/lib/db/queries';
import JoinButton, { SimpleSubmissionDialog } from './join-button';
import { TabNavigationButtons } from './tab-navigation-buttons';
import { getRewardLabel, formatRewardValue, getRewardUnit } from '@/lib/reward-utils';
import { RoleContextBadgeWrapper } from './role-context-badge-wrapper';

interface PageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

async function getChallengeForParticipant(workspaceSlug: string, challengeId: string, userId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return null;
    }

    const [challenge, pointsBalance] = await Promise.all([
      prisma.challenge.findFirst({
        where: {
          id: challengeId,
          workspaceId: workspace.id,
        },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          status: true,
          enrollmentDeadline: true,
          rewardType: true,
          rewardConfig: true,
          Enrollment: {
            where: {
              userId: userId,
            },
            select: {
              id: true,
              userId: true,
              status: true,
              createdAt: true,
            },
          },
          Activity: {
            select: {
              id: true,
              pointsValue: true,
              maxSubmissions: true,
              deadline: true,
              isRequired: true,
              ActivityTemplate: {
                select: {
                  name: true,
                  description: true,
                  type: true,
                  requiresApproval: true,
                },
              },
              ActivitySubmission: {
                where: {
                  userId: userId,
                },
                orderBy: {
                  submittedAt: 'desc',
                },
                select: {
                  id: true,
                  status: true,
                  submittedAt: true,
                  pointsAwarded: true,
                },
              },
              _count: {
                select: {
                  ActivitySubmission: true,
                },
              },
            },
          },
          _count: {
            select: {
              Enrollment: true,
            },
          },
        },
      }),
      prisma.pointsBalance.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId: workspace.id
          }
        }
      })
    ]);

    return { challenge, pointsBalance };
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return null;
  }
}

async function ChallengeLeaderboardContent({ 
  challengeId, 
  workspaceId, 
  currentUserId 
}: { 
  challengeId: string; 
  workspaceId: string; 
  currentUserId: string; 
}) {
  try {
    const leaderboardData = await getChallengeLeaderboard(challengeId, workspaceId, 15)
    
    if (leaderboardData.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-coral-500" />
              Challenge Leaderboard
            </CardTitle>
            <CardDescription>
              Top participants in this challenge based on points earned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Award className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rankings yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Start completing activities to see rankings for this challenge. Be the first to earn points!
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    const topThree = leaderboardData.slice(0, 3)
    const remaining = leaderboardData.slice(3)
    const currentUserRank = leaderboardData.findIndex(entry => entry.userId === currentUserId) + 1

    return (
      <div className="space-y-6">
        {/* Current User Rank */}
        {currentUserRank > 0 && (
          <Card className="bg-gradient-to-r from-coral-50 to-blue-50 border-coral-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-coral-500 rounded-full flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">Your Challenge Ranking</p>
                    <p className="text-sm text-gray-600">
                      {leaderboardData.find(entry => entry.userId === currentUserId)?.totalPoints || 0} points earned in this challenge
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-coral-600">#{currentUserRank}</div>
                  <div className="text-sm text-gray-500">of {leaderboardData.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 Challenge Winners */}
        {topThree.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top Challenge Performers
              </CardTitle>
              <CardDescription>
                Leading participants in this challenge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topThree.map((entry, index) => {
                  const rank = index + 1
                  const isCurrentUser = entry.userId === currentUserId
                  const displayName = entry.email.split('@')[0]
                  
                  const cardStyles = {
                    1: "bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-300",
                    2: "bg-gradient-to-br from-gray-100 to-slate-100 border-gray-300", 
                    3: "bg-gradient-to-br from-orange-100 to-amber-100 border-orange-300"
                  }

                  const icons = {
                    1: <Crown className="h-8 w-8 text-amber-600" />,
                    2: <Medal className="h-8 w-8 text-gray-500" />,
                    3: <Award className="h-8 w-8 text-amber-600" />
                  }

                  const positions = {
                    1: "🥇 1st Place",
                    2: "🥈 2nd Place", 
                    3: "🥉 3rd Place"
                  }

                  return (
                    <Card key={entry.userId} className={`${cardStyles[rank as keyof typeof cardStyles]} transition-all duration-200 hover:shadow-lg`}>
                      <CardContent className="p-6 text-center">
                        <div className="mb-4">
                          {icons[rank as keyof typeof icons]}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-600">
                            {positions[rank as keyof typeof positions]}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <p className="font-bold text-lg text-gray-900">{displayName}</p>
                            {isCurrentUser && (
                              <Badge className="bg-coral-500 text-white text-xs">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-amber-500" />
                            <span className="text-2xl font-bold text-gray-800">{entry.totalPoints}</span>
                            <span className="text-sm text-gray-600">pts</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.completedActivities} activities • {entry.submissions} submissions
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Challenge Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-coral-500" />
              Complete Rankings
            </CardTitle>
            <CardDescription>
              All participants ranked by points earned in this challenge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboardData.map((entry, index) => {
                const rank = index + 1
                const isCurrentUser = entry.userId === currentUserId
                const displayName = entry.email.split('@')[0]
                
                const getRankIcon = (rank: number) => {
                  switch (rank) {
                    case 1:
                      return <Crown className="h-5 w-5 text-amber-500" />
                    case 2:
                      return <Medal className="h-5 w-5 text-gray-400" />
                    case 3:
                      return <Award className="h-5 w-5 text-amber-600" />
                    default:
                      return <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{rank}</div>
                  }
                }

                const getRankColor = (rank: number) => {
                  switch (rank) {
                    case 1:
                      return "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                    case 2:
                      return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
                    case 3:
                      return "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
                    default:
                      return isCurrentUser 
                        ? "bg-gradient-to-r from-coral-50 to-pink-50 border-coral-200" 
                        : "bg-white border-gray-200"
                  }
                }

                return (
                  <Card key={entry.userId} className={`transition-all duration-200 ${getRankColor(rank)} ${isCurrentUser ? 'ring-2 ring-coral-300' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getRankIcon(rank)}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{displayName}</p>
                              {isCurrentUser && (
                                <Badge className="bg-coral-500 text-white text-xs">You</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {entry.completedActivities} activities completed • {entry.submissions} submissions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-coral-600">{entry.totalPoints}</div>
                          <div className="text-xs text-gray-500">points</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error('Error loading challenge leaderboard:', error)
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Unable to load leaderboard data</p>
        </CardContent>
      </Card>
    )
  }
}

export default async function ParticipantChallengeDetailPage({ params }: PageProps) {
  try {
    const { slug, id } = await params;
    const { user, workspace } = await requireWorkspaceAccessCanonical(slug);
    const result = await getChallengeForParticipant(slug, id, user.id);

    if (!result || !result.challenge) {
      notFound();
    }

    const { challenge, pointsBalance } = result;

    // Gate visibility: require published status AND user is invited/enrolled
    const status: ChallengeStatus | undefined = challenge?.status
    const isEnrolled = Boolean(challenge?.Enrollment && challenge.Enrollment.length > 0);
    const enrollmentStatus = isEnrolled ? challenge!.Enrollment![0]?.status : undefined
    const hasAccess = (enrollmentStatus === 'INVITED' || enrollmentStatus === 'ENROLLED')
    if ((status && status !== 'PUBLISHED') || !hasAccess) {
      notFound();
    }

    // Define variables with explicit typing and null checks
    // isEnrolled computed above for consistency
    const enrollment = challenge?.Enrollment?.[0];
    const hasActivities = Boolean(challenge?.Activity && challenge.Activity.length > 0);

    return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-4">
          <Link href={`/w/${slug}/participant/challenges`}>
            <Button variant="ghost" size="sm" className="w-fit">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Challenges
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-navy-900">{challenge.title}</h1>
            <div className="flex items-center gap-3">
              <RoleContextBadgeWrapper workspaceSlug={slug} challengeId={challenge.id} showDetails />
              <p className="text-gray-600 md:hidden">{challenge._count.Enrollment} participants enrolled</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between md:justify-end md:space-x-3">
          {isEnrolled ? (
            <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">
              <CheckCircle className="h-4 w-4 mr-1" />
              Enrolled
            </Badge>
          ) : (
            <div className="md:hidden">
              <JoinButton challengeId={challenge.id} workspaceSlug={slug} />
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Bar - Mobile First */}
      {!isEnrolled && (
        <div className="bg-coral-50 border border-coral-200 rounded-lg p-4 md:hidden">
          <div className="text-center space-y-3">
            <h3 className="font-semibold text-coral-800">Ready to join this challenge?</h3>
            <JoinButton challengeId={challenge.id} workspaceSlug={slug} />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Participants</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{challenge._count.Enrollment}</div>
            <p className="text-xs text-blue-700">Total enrolled</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Status</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-600 hover:bg-green-700 text-white">
              ACTIVE
            </Badge>
            <p className="text-xs text-green-700 mt-1">Challenge open</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-coral-50 to-coral-100 border-coral-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-coral-800">Your Progress</CardTitle>
            <Trophy className="h-4 w-4 text-coral-600" />
          </CardHeader>
          <CardContent>
            {isEnrolled ? (
              <div>
                <div className="text-xl md:text-2xl font-bold text-coral-900">In Progress</div>
                <p className="text-xs text-coral-700">Keep going!</p>
              </div>
            ) : (
              <div>
                <div className="text-xl md:text-2xl font-bold text-gray-600">Not Started</div>
                <p className="text-xs text-gray-500">Join to begin</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">
              {getRewardLabel(challenge.rewardType as any)}
            </CardTitle>
            <Star className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {isEnrolled ? (
              <div>
                <div className="text-xl md:text-2xl font-bold text-amber-900">
                  {formatRewardValue(challenge.rewardType as any, pointsBalance?.totalPoints || 0)}
                </div>
                <p className="text-xs text-amber-700">
                  / {formatRewardValue(challenge.rewardType as any, challenge.Activity?.reduce((sum, activity) => sum + activity.pointsValue, 0) || 0)} available
                </p>
              </div>
            ) : (
              <div>
                <div className="text-xl md:text-2xl font-bold text-amber-900">
                  {formatRewardValue(challenge.rewardType as any, challenge.Activity?.reduce((sum, activity) => sum + activity.pointsValue, 0) || 0)}
                </div>
                <p className="text-xs text-amber-700">
                  {getRewardLabel(challenge.rewardType as any).split(' ')[0]} available
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1">
          <TabsTrigger value="overview" className="text-xs md:text-sm py-2">Overview</TabsTrigger>
          <TabsTrigger value="activities" className="text-xs md:text-sm py-2">
            Activities
            {isEnrolled && challenge.Activity && challenge.Activity.length > 0 && (
              <Badge className="ml-1 bg-coral-500 text-white text-[10px] px-1.5 py-0.5">
                {challenge.Activity.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="progress" className="text-xs md:text-sm py-2">My Progress</TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs md:text-sm py-2">Leaderboard</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Challenge Description - Takes up more space */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-coral-500" />
                    Challenge Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{challenge.description}</p>
                </CardContent>
              </Card>
            </div>

            {/* Action Panel - More prominent */}
            <div className="space-y-4">
              {!isEnrolled ? (
                <Card className="border-coral-200 bg-coral-50">
                  <CardHeader>
                    <CardTitle className="text-coral-800">Join Challenge</CardTitle>
                    <CardDescription className="text-coral-700">
                      Ready to take on this challenge?
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <JoinButton challengeId={challenge.id} workspaceSlug={slug} />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800">Quick Actions</CardTitle>
                    <CardDescription className="text-green-700">
                      You're enrolled! Get started.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {typeof hasActivities === 'boolean' ? (
                      <TabNavigationButtons hasActivities={hasActivities} />
                    ) : (
                      <TabNavigationButtons hasActivities={false} />
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Challenge Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-coral-500" />
                    <div>
                      <span className="font-medium block text-xs text-gray-500">Started</span>
                      <span className="text-gray-700">{format(new Date(challenge.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2 text-blue-500" />
                    <div>
                      <span className="font-medium block text-xs text-gray-500">Participants</span>
                      <span className="text-gray-700">{challenge._count.Enrollment} enrolled</span>
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <Star className="h-4 w-4 mr-2 text-amber-500" />
                    <div>
                      <span className="font-medium block text-xs text-gray-500">Total Points</span>
                      <span className="text-gray-700">{challenge.Activity?.reduce((sum, activity) => sum + activity.pointsValue, 0) || 100} points</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          {isEnrolled ? (
            challenge.Activity && challenge.Activity.length > 0 ? (
              <>
                {/* Activities Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-coral-50 to-amber-50 rounded-lg border border-coral-200">
                  <div>
                    <h3 className="font-semibold text-coral-800">Challenge Activities</h3>
                    <p className="text-sm text-coral-700">Complete activities to earn points and progress</p>
                  </div>
                  <Badge className="bg-coral-500 text-white w-fit">
                    {challenge.Activity.length} activities available
                  </Badge>
                </div>

                <div className="space-y-4">
                  {challenge.Activity.map((activity) => {
                    const userSubmissions = activity.ActivitySubmission || [];
                    const submissionCount = userSubmissions.length;
                    const canSubmit = submissionCount < activity.maxSubmissions;
                    const hasDeadlinePassed = activity.deadline && new Date() > new Date(activity.deadline);
                    const latestSubmission = userSubmissions[0];
                    
                    return (
                      <Card key={activity.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <CardTitle className="flex flex-wrap items-center gap-2">
                                <span className="text-lg">{activity.ActivityTemplate.name}</span>
                                {activity.isRequired && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                                  {activity.pointsValue} pts
                                </Badge>
                              </CardTitle>
                              <CardDescription className="text-sm leading-relaxed">
                                {activity.ActivityTemplate.description}
                              </CardDescription>
                            </div>
                            
                            <div className="flex sm:flex-col items-start sm:items-end gap-2 text-xs text-muted-foreground">
                              <div className="text-right">
                                <span className="font-medium">{submissionCount}/{activity.maxSubmissions}</span>
                                <span className="block">submissions</span>
                              </div>
                              {activity.deadline && (
                                <div className="text-right">
                                  <span className="block font-medium">Due:</span>
                                  <span className="block">{format(new Date(activity.deadline), 'MMM d')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Activity Metadata */}
                          <div className="flex flex-wrap gap-3 text-xs bg-gray-50 p-3 rounded-lg">
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3 text-coral-500" />
                              {activity.ActivityTemplate.type.replace('_', ' ').toLowerCase()}
                            </span>
                            {activity.ActivityTemplate.requiresApproval && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-blue-500" />
                                Requires approval
                              </span>
                            )}
                            {activity.maxSubmissions > 1 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-green-500" />
                                Multiple submissions allowed
                              </span>
                            )}
                          </div>

                          {/* Latest Submission Status */}
                          {latestSubmission && (
                            <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-blue-800">Latest Submission</p>
                                  <p className="text-xs text-blue-600">
                                    Submitted {format(new Date(latestSubmission.submittedAt), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                                <Badge 
                                  className={
                                    latestSubmission.status === 'APPROVED' ? 'bg-green-500 text-white' :
                                    latestSubmission.status === 'REJECTED' ? 'bg-red-500 text-white' :
                                    latestSubmission.status === 'DRAFT' ? 'bg-gray-500 text-white' : 'bg-yellow-500 text-white'
                                  }
                                >
                                  {latestSubmission.status.toLowerCase()}
                                </Badge>
                              </div>
                              {latestSubmission.pointsAwarded && (
                                <div className="mt-2 p-2 bg-green-100 rounded text-center">
                                  <p className="text-sm font-semibold text-green-700">
                                    🎉 {latestSubmission.pointsAwarded} points awarded!
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                            {canSubmit && !hasDeadlinePassed ? (
                              <SimpleSubmissionDialog 
                                activityId={activity.id}
                                activityName={activity.ActivityTemplate.name}
                                activityType={activity.ActivityTemplate.type}
                                pointsValue={activity.pointsValue}
                                maxSubmissions={activity.maxSubmissions}
                                deadline={activity.deadline ? activity.deadline.toISOString() : null}
                                isRequired={activity.isRequired}
                                requiresApproval={activity.ActivityTemplate.requiresApproval}
                                submissionCount={activity._count.ActivitySubmission}
                                challengeId={challenge.id}
                                challengeTitle={challenge.title}
                                workspaceSlug={slug}
                              />
                            ) : hasDeadlinePassed ? (
                              <Button variant="outline" disabled className="flex-1">
                                <Clock className="h-4 w-4 mr-2" />
                                Deadline Passed
                              </Button>
                            ) : (
                              <Button variant="outline" disabled className="flex-1">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Submission Limit Reached
                              </Button>
                            )}
                            
                            {userSubmissions.length > 0 && (
                              <Button variant="ghost" size="sm" className="text-gray-600">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Submissions ({userSubmissions.length})
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            ) : (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Activities Yet</h3>
                  <p className="text-gray-500 mb-4">Activities haven't been assigned to this challenge yet.</p>
                  <p className="text-sm text-gray-400">Check back soon or contact an admin.</p>
                </CardContent>
              </Card>
            )
          ) : (
            <Card className="border-coral-200 bg-coral-50">
              <CardContent className="text-center py-12">
                <Trophy className="h-16 w-16 mx-auto text-coral-300 mb-4" />
                <h3 className="text-lg font-semibold text-coral-800 mb-2">Join to See Activities</h3>
                <p className="text-coral-700 mb-6">Enroll in this challenge to view and participate in activities.</p>
                <JoinButton challengeId={challenge.id} workspaceSlug={slug} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          {isEnrolled ? (
            <>
              {/* Progress Overview */}
              <Card className="bg-gradient-to-r from-coral-50 to-blue-50 border-coral-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-coral-500" />
                    Your Challenge Progress
                  </CardTitle>
                  <CardDescription>
                    Track your activities and achievements in this challenge
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-2xl font-bold text-coral-600">
                        {challenge.Activity?.reduce((count, activity) => 
                          count + (activity.ActivitySubmission && activity.ActivitySubmission.length > 0 ? 1 : 0), 0) || 0}
                      </div>
                      <div className="text-xs text-gray-600">Activities Attempted</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-2xl font-bold text-green-600">
                        {challenge.Activity?.reduce((count, activity) => 
                          count + (activity.ActivitySubmission?.filter(s => s.status === 'APPROVED').length || 0), 0) || 0}
                      </div>
                      <div className="text-xs text-gray-600">Approved</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-2xl font-bold text-amber-600">
                        {challenge.Activity?.reduce((count, activity) => 
                          count + (activity.ActivitySubmission?.reduce((sum, s) => sum + (s.pointsAwarded || 0), 0) || 0), 0) || 0}
                      </div>
                      <div className="text-xs text-gray-600">Points Earned</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-2xl font-bold text-blue-600">
                        {challenge.Activity?.length ? 
                          Math.round(((challenge.Activity.reduce((count, activity) => 
                            count + (activity.ActivitySubmission && activity.ActivitySubmission.length > 0 ? 1 : 0), 0)) / challenge.Activity.length) * 100) : 0}%
                      </div>
                      <div className="text-xs text-gray-600">Completion</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Progress Timeline
                  </CardTitle>
                  <CardDescription>
                    Your journey through this challenge
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Enrollment Step */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg bg-green-50 border-green-200">
                      <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800">Challenge Enrolled</p>
                        <p className="text-sm text-green-700">
                          Joined on {enrollment && format(new Date(enrollment.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    {/* Activities Progress */}
                    {challenge.Activity && challenge.Activity.length > 0 ? (
                      <>
                        <div className="flex items-start gap-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
                          <Activity className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-blue-800">Activities Available</p>
                            <p className="text-sm text-blue-700">
                              {challenge.Activity.length} activities to complete
                            </p>
                          </div>
                        </div>

                        {/* Individual Activity Progress */}
                        {challenge.Activity.map((activity) => {
                          const userSubmissions = activity.ActivitySubmission || [];
                          const latestSubmission = userSubmissions[0];
                          const hasSubmitted = userSubmissions.length > 0;
                          
                          return (
                            <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg">
                              {latestSubmission?.status === 'APPROVED' ? (
                                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                              ) : hasSubmitted ? (
                                <Clock className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
                              ) : (
                                <div className="h-6 w-6 border-2 border-gray-300 rounded-full mt-1 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium">
                                  {activity.ActivityTemplate.name}
                                  {activity.isRequired && (
                                    <Badge className="ml-2 bg-red-100 text-red-800 text-xs">Required</Badge>
                                  )}
                                </p>
                                <div className="text-sm text-gray-600">
                                  {latestSubmission?.status === 'APPROVED' ? (
                                    <span className="text-green-600">
                                      ✅ Completed - {latestSubmission.pointsAwarded || activity.pointsValue} points earned
                                    </span>
                                  ) : hasSubmitted ? (
                                    <span className="text-yellow-600">
                                      ⏳ Submitted, waiting for review
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">
                                      Not started - {activity.pointsValue} points available
                                    </span>
                                  )}
                                </div>
                                {latestSubmission && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Last activity: {format(new Date(latestSubmission.submittedAt), 'MMM d, yyyy h:mm a')}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="flex items-start gap-4 p-4 border rounded-lg border-dashed">
                        <AlertCircle className="h-6 w-6 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-600">Waiting for Activities</p>
                          <p className="text-sm text-gray-500">
                            No activities have been assigned yet. Check back soon!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-coral-200 bg-coral-50">
              <CardContent className="text-center py-12">
                <Trophy className="h-16 w-16 mx-auto text-coral-300 mb-4" />
                <h3 className="text-lg font-semibold text-coral-800 mb-2">Track Your Progress</h3>
                <p className="text-coral-700 mb-6">Join this challenge to start tracking your progress and achievements.</p>
                <JoinButton challengeId={challenge.id} workspaceSlug={slug} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <ChallengeLeaderboardContent 
            challengeId={challenge.id} 
            workspaceId={workspace.id} 
            currentUserId={user.id}
          />
        </TabsContent>
      </Tabs>
    </div>
    );
  } catch (error) {
    console.error('Error loading challenge:', error);
    notFound();
  }
}