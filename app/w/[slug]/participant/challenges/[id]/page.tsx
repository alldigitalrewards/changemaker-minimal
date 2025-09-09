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
  UserPlus,
  Clock,
  Target,
  CheckCircle,
  Star,
  Award
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { prisma } from '@/lib/db';
import { getCurrentUser, requireWorkspaceAccess } from '@/lib/auth/session';
import JoinButton, { SimpleSubmissionDialog } from './join-button';

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

    const challenge = await prisma.challenge.findFirst({
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
    });

    return challenge;
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return null;
  }
}

export default async function ParticipantChallengeDetailPage({ params }: PageProps) {
  try {
    const { slug, id } = await params;
    const { user, workspace } = await requireWorkspaceAccess(slug);
    const challenge = await getChallengeForParticipant(slug, id, user.id);

    if (!challenge) {
      notFound();
    }

    const isEnrolled = challenge.enrollments && challenge.enrollments.length > 0;
    const enrollment = challenge.enrollments?.[0];

    return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/w/${slug}/participant/challenges`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Challenges
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-navy-900">{challenge.title}</h1>
        </div>
        {isEnrolled && (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" />
            Enrolled
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{challenge._count.enrollments}</div>
            <p className="text-xs text-muted-foreground">Total enrolled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="text-lg">
              ACTIVE
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Progress</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isEnrolled ? (
              <div>
                <div className="text-2xl font-bold">In Progress</div>
                <p className="text-xs text-muted-foreground">Keep going!</p>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-bold">Not Started</div>
                <p className="text-xs text-muted-foreground">Join to begin</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100</div>
            <p className="text-xs text-muted-foreground">Available points</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="progress">My Progress</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Challenge Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{challenge.description}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Challenge Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Started:</span>
                  <span className="ml-2">{format(new Date(challenge.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Users className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Participants:</span>
                  <span className="ml-2">{challenge._count.enrollments} enrolled</span>
                </div>
                <div className="flex items-center text-sm">
                  <Trophy className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Difficulty:</span>
                  <span className="ml-2">Medium</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!isEnrolled ? (
                  <JoinButton challengeId={challenge.id} workspaceSlug={slug} />
                ) : (
                  <>
                    <Button className="w-full" variant="outline">
                      <Award className="h-4 w-4 mr-2" />
                      Submit Entry
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      View Team
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          {isEnrolled ? (
            challenge.activities && challenge.activities.length > 0 ? (
              <div className="space-y-4">
                {challenge.activities.map((activity) => {
                  const userSubmissions = activity.submissions || [];
                  const submissionCount = userSubmissions.length;
                  const canSubmit = submissionCount < activity.maxSubmissions;
                  const hasDeadlinePassed = activity.deadline && new Date() > new Date(activity.deadline);
                  const latestSubmission = userSubmissions[0];
                  
                  return (
                    <Card key={activity.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                              {activity.template.name}
                              {activity.isRequired && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                            </CardTitle>
                            <CardDescription>{activity.template.description}</CardDescription>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant="outline">
                              {activity.pointsValue} points
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {submissionCount}/{activity.maxSubmissions} submissions
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Activity Details */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Type: {activity.template.type.replace('_', ' ')}</span>
                          {activity.deadline && (
                            <span>Due: {format(new Date(activity.deadline), 'MMM d, yyyy')}</span>
                          )}
                          <span>Max: {activity.maxSubmissions}</span>
                        </div>

                        {/* Latest Submission Status */}
                        {latestSubmission && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">Latest Submission</p>
                                <p className="text-xs text-muted-foreground">
                                  Submitted {format(new Date(latestSubmission.submittedAt), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                              <Badge 
                                variant={
                                  latestSubmission.status === 'APPROVED' ? 'default' :
                                  latestSubmission.status === 'REJECTED' ? 'destructive' :
                                  latestSubmission.status === 'DRAFT' ? 'secondary' : 'outline'
                                }
                              >
                                {latestSubmission.status}
                              </Badge>
                            </div>
                            {latestSubmission.pointsAwarded && (
                              <p className="text-xs text-green-600 mt-1">
                                Points awarded: {latestSubmission.pointsAwarded}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {canSubmit && !hasDeadlinePassed ? (
                            <SimpleSubmissionDialog 
                              activity={activity}
                              challenge={challenge}
                              workspaceSlug={slug}
                            />
                          ) : hasDeadlinePassed ? (
                            <Button variant="outline" disabled>
                              Deadline Passed
                            </Button>
                          ) : (
                            <Button variant="outline" disabled>
                              Submission Limit Reached
                            </Button>
                          )}
                          
                          {userSubmissions.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              {userSubmissions.length} submission(s) made
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No activities have been assigned to this challenge yet.</p>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">Join this challenge to view and participate in activities.</p>
                <JoinButton challengeId={challenge.id} workspaceSlug={slug} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
              <CardDescription>
                Track your journey through this challenge
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEnrolled ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Enrolled in Challenge</p>
                        <p className="text-sm text-gray-500">
                          Joined on {enrollment && format(new Date(enrollment.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">In Progress</p>
                        <p className="text-sm text-gray-500">Keep working on your submission</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">Join this challenge to start tracking your progress</p>
                  <JoinButton challengeId={challenge.id} workspaceSlug={slug} />
                </div>
              )}
            </CardContent>
          </Card>
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