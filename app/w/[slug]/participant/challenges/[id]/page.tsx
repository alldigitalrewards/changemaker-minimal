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
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { prisma } from '@/lib/db';
import { getCurrentUser, requireWorkspaceAccess } from '@/lib/auth/session';
import JoinButton, { SimpleSubmissionDialog } from './join-button';
import { TabNavigationButtons } from './tab-navigation-buttons';

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
        include: {
          enrollments: {
            where: {
              userId: userId,
            },
          },
          activities: {
            include: {
              template: true,
              submissions: {
                where: {
                  userId: userId,
                },
                orderBy: {
                  submittedAt: 'desc',
                },
              },
              _count: {
                select: {
                  submissions: true,
                },
              },
            },
          },
          _count: {
            select: {
              enrollments: true,
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

export default async function ParticipantChallengeDetailPage({ params }: PageProps) {
  try {
    const { slug, id } = await params;
    const { user, workspace } = await requireWorkspaceAccess(slug);
    const result = await getChallengeForParticipant(slug, id, user.id);

    if (!result || !result.challenge) {
      notFound();
    }

    const { challenge, pointsBalance } = result;

    // Define variables with explicit typing and null checks
    const isEnrolled = Boolean(challenge?.enrollments && challenge.enrollments.length > 0);
    const enrollment = challenge?.enrollments?.[0];
    const hasActivities = Boolean(challenge?.activities && challenge.activities.length > 0);

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
          <div className="space-y-2 md:space-y-0">
            <h1 className="text-2xl md:text-3xl font-bold text-navy-900">{challenge.title}</h1>
            <p className="text-gray-600 md:hidden">{challenge._count.enrollments} participants enrolled</p>
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
            <div className="text-2xl font-bold text-blue-900">{challenge._count.enrollments}</div>
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
            <CardTitle className="text-sm font-medium text-amber-800">Your Points</CardTitle>
            <Star className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {isEnrolled ? (
              <div>
                <div className="text-xl md:text-2xl font-bold text-amber-900">
                  {pointsBalance?.totalPoints || 0}
                </div>
                <p className="text-xs text-amber-700">
                  / {challenge.activities?.reduce((sum, activity) => sum + activity.pointsValue, 0) || 0} available
                </p>
              </div>
            ) : (
              <div>
                <div className="text-xl md:text-2xl font-bold text-amber-900">
                  {challenge.activities?.reduce((sum, activity) => sum + activity.pointsValue, 0) || 0}
                </div>
                <p className="text-xs text-amber-700">Points available</p>
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
            {isEnrolled && challenge.activities && challenge.activities.length > 0 && (
              <Badge className="ml-1 bg-coral-500 text-white text-[10px] px-1.5 py-0.5">
                {challenge.activities.length}
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
                      <span className="text-gray-700">{challenge._count.enrollments} enrolled</span>
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <Star className="h-4 w-4 mr-2 text-amber-500" />
                    <div>
                      <span className="font-medium block text-xs text-gray-500">Total Points</span>
                      <span className="text-gray-700">{challenge.activities?.reduce((sum, activity) => sum + activity.pointsValue, 0) || 100} points</span>
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
            challenge.activities && challenge.activities.length > 0 ? (
              <>
                {/* Activities Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-coral-50 to-amber-50 rounded-lg border border-coral-200">
                  <div>
                    <h3 className="font-semibold text-coral-800">Challenge Activities</h3>
                    <p className="text-sm text-coral-700">Complete activities to earn points and progress</p>
                  </div>
                  <Badge className="bg-coral-500 text-white w-fit">
                    {challenge.activities.length} activities available
                  </Badge>
                </div>

                <div className="space-y-4">
                  {challenge.activities.map((activity) => {
                    const userSubmissions = activity.submissions || [];
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
                                <span className="text-lg">{activity.template.name}</span>
                                {activity.isRequired && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                                  {activity.pointsValue} pts
                                </Badge>
                              </CardTitle>
                              <CardDescription className="text-sm leading-relaxed">
                                {activity.template.description}
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
                              {activity.template.type.replace('_', ' ').toLowerCase()}
                            </span>
                            {activity.template.requiresApproval && (
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
                                activityName={activity.template.name}
                                activityType={activity.template.type}
                                pointsValue={activity.pointsValue}
                                maxSubmissions={activity.maxSubmissions}
                                deadline={activity.deadline ? activity.deadline.toISOString() : null}
                                isRequired={activity.isRequired}
                                requiresApproval={activity.template.requiresApproval}
                                submissionCount={activity._count.submissions}
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
                        {challenge.activities?.reduce((count, activity) => 
                          count + (activity.submissions && activity.submissions.length > 0 ? 1 : 0), 0) || 0}
                      </div>
                      <div className="text-xs text-gray-600">Activities Attempted</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-2xl font-bold text-green-600">
                        {challenge.activities?.reduce((count, activity) => 
                          count + (activity.submissions?.filter(s => s.status === 'APPROVED').length || 0), 0) || 0}
                      </div>
                      <div className="text-xs text-gray-600">Approved</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-2xl font-bold text-amber-600">
                        {challenge.activities?.reduce((count, activity) => 
                          count + (activity.submissions?.reduce((sum, s) => sum + (s.pointsAwarded || 0), 0) || 0), 0) || 0}
                      </div>
                      <div className="text-xs text-gray-600">Points Earned</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-2xl font-bold text-blue-600">
                        {challenge.activities?.length ? 
                          Math.round(((challenge.activities.reduce((count, activity) => 
                            count + (activity.submissions && activity.submissions.length > 0 ? 1 : 0), 0)) / challenge.activities.length) * 100) : 0}%
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
                    {challenge.activities && challenge.activities.length > 0 ? (
                      <>
                        <div className="flex items-start gap-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
                          <Activity className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-blue-800">Activities Available</p>
                            <p className="text-sm text-blue-700">
                              {challenge.activities.length} activities to complete
                            </p>
                          </div>
                        </div>

                        {/* Individual Activity Progress */}
                        {challenge.activities.map((activity) => {
                          const userSubmissions = activity.submissions || [];
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
                                  {activity.template.name}
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
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                Top participants in this challenge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Leaderboard will be available once the challenge begins</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    );
  } catch (error) {
    console.error('Error loading challenge:', error);
    notFound();
  }
}