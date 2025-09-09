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
  Edit,
  UserPlus,
  Clock,
  Target,
  CheckCircle,
  Activity,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { prisma } from '@/lib/db';
import { DeleteChallengeButton } from './delete-button';
import { ChallengeActivities } from '@/components/activities/challenge-activities';
import { SubmissionReviewButton } from './submission-review-button';

interface PageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

async function getChallenge(workspaceSlug: string, challengeId: string) {
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
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
        activities: {
          include: {
            template: true,
            submissions: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                  }
                },
                enrollment: true,
              },
              orderBy: {
                submittedAt: 'desc'
              }
            }
          }
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

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { slug, id } = await params;
  const challenge = await getChallenge(slug, id);

  if (!challenge) {
    notFound();
  }

  const enrolledUsers = challenge.enrollments || [];
  const activeEnrollments = enrolledUsers.filter(e => e.status === 'ENROLLED').length;
  const completedEnrollments = enrolledUsers.filter(e => e.status === 'WITHDRAWN').length;
  
  // Calculate challenge status based on dates
  const now = new Date();
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  
  let challengeStatus: string;
  let statusVariant: "default" | "secondary" | "destructive" | "outline";
  
  if (now < startDate) {
    challengeStatus = "UPCOMING";
    statusVariant = "outline";
  } else if (now >= startDate && now <= endDate) {
    challengeStatus = "ACTIVE";
    statusVariant = "default";
  } else {
    challengeStatus = "ENDED";
    statusVariant = "secondary";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/w/${slug}/admin/challenges`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Challenges
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-navy-900">{challenge.title}</h1>
        </div>
        <div className="flex space-x-2">
          <Link href={`/w/${slug}/admin/challenges/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <DeleteChallengeButton 
            challengeId={id}
            challengeTitle={challenge.title}
            workspaceSlug={slug}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{challenge._count.enrollments}</div>
            <p className="text-xs text-muted-foreground">Participants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEnrollments}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedEnrollments}</div>
            <p className="text-xs text-muted-foreground">Finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={statusVariant} className="text-lg">
              {challengeStatus}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="submissions">
            <ClipboardList className="h-4 w-4 mr-1" />
            Submissions
            {challenge.activities && challenge.activities.some(a => a.submissions.some(s => s.status === 'PENDING')) && (
              <Badge className="ml-2 bg-red-500 text-white text-xs">
                {challenge.activities.reduce((count, a) => count + a.submissions.filter(s => s.status === 'PENDING').length, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
                  <Calendar className="h-4 w-4 mr-2 text-green-600" />
                  <span className="font-medium">Start Date:</span>
                  <span className="ml-2">{format(new Date(challenge.startDate), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-red-600" />
                  <span className="font-medium">End Date:</span>
                  <span className="ml-2">{format(new Date(challenge.endDate), 'MMM d, yyyy')}</span>
                </div>
                {challenge.enrollmentDeadline && (
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-amber-600" />
                    <span className="font-medium">Enrollment Deadline:</span>
                    <span className="ml-2">{format(new Date(challenge.enrollmentDeadline), 'MMM d, yyyy')}</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Created:</span>
                  <span className="ml-2">{format(new Date(challenge.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Last Updated:</span>
                  <span className="ml-2">{format(new Date(challenge.updatedAt), 'MMM d, yyyy')}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Participants
                </Button>
                <Button className="w-full" variant="outline">
                  <Trophy className="h-4 w-4 mr-2" />
                  View Leaderboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <ChallengeActivities challengeId={id} workspaceSlug={slug} />
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-coral-500" />
                Activity Submissions
              </CardTitle>
              <CardDescription>
                Review and approve participant submissions for activities in this challenge
              </CardDescription>
            </CardHeader>
            <CardContent>
              {challenge.activities && challenge.activities.length > 0 ? (
                <div className="space-y-6">
                  {challenge.activities.map((activity) => {
                    const submissions = activity.submissions || [];
                    const pendingSubmissions = submissions.filter(s => s.status === 'PENDING');
                    const approvedSubmissions = submissions.filter(s => s.status === 'APPROVED');
                    const rejectedSubmissions = submissions.filter(s => s.status === 'REJECTED');

                    if (submissions.length === 0) return null;

                    return (
                      <div key={activity.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{activity.template.name}</h3>
                            <p className="text-sm text-gray-600">{activity.template.description}</p>
                            <div className="flex gap-4 text-xs text-gray-500 mt-1">
                              <span>Points: {activity.pointsValue}</span>
                              <span>Type: {activity.template.type.replace('_', ' ')}</span>
                              <span>Max submissions: {activity.maxSubmissions}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Submissions</div>
                            <div className="flex gap-2 text-xs">
                              {pendingSubmissions.length > 0 && (
                                <Badge className="bg-yellow-500 text-white">
                                  {pendingSubmissions.length} Pending
                                </Badge>
                              )}
                              {approvedSubmissions.length > 0 && (
                                <Badge className="bg-green-500 text-white">
                                  {approvedSubmissions.length} Approved
                                </Badge>
                              )}
                              {rejectedSubmissions.length > 0 && (
                                <Badge className="bg-red-500 text-white">
                                  {rejectedSubmissions.length} Rejected
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {submissions.map((submission) => (
                            <div 
                              key={submission.id} 
                              className={`border rounded-lg p-4 ${
                                submission.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200' :
                                submission.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
                                'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{submission.user.email}</span>
                                    <Badge 
                                      className={
                                        submission.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                                        submission.status === 'APPROVED' ? 'bg-green-500 text-white' :
                                        'bg-red-500 text-white'
                                      }
                                    >
                                      {submission.status.toLowerCase()}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Submitted {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
                                  </div>
                                </div>
                                {submission.status === 'PENDING' && (
                                  <div className="flex gap-2">
                                    <SubmissionReviewButton
                                      submissionId={submission.id}
                                      action="approve"
                                      workspaceSlug={slug}
                                      pointsValue={activity.pointsValue}
                                    />
                                    <SubmissionReviewButton
                                      submissionId={submission.id}
                                      action="reject"
                                      workspaceSlug={slug}
                                      pointsValue={activity.pointsValue}
                                    />
                                  </div>
                                )}
                              </div>
                              
                              <div className="bg-white p-3 rounded border">
                                <p className="text-sm">{submission.textContent}</p>
                              </div>
                              
                              {submission.pointsAwarded && (
                                <div className="mt-2 text-xs text-green-600">
                                  Points awarded: {submission.pointsAwarded}
                                </div>
                              )}
                              
                              {submission.reviewNotes && (
                                <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                                  <strong>Review notes:</strong> {submission.reviewNotes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No activities with submissions yet.</p>
                  <p className="text-sm text-gray-400">Add activities to this challenge to see submissions here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Challenge Participants</CardTitle>
                  <CardDescription>
                    {enrolledUsers.length} participants enrolled in this challenge
                  </CardDescription>
                </div>
                <Link href={`/w/${slug}/admin/challenges/${id}/edit`}>
                  <Button variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Manage Participants
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {enrolledUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No participants enrolled yet</p>
                  <Link href={`/w/${slug}/admin/challenges/${id}/edit`}>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Participants
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrolledUsers.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{enrollment.user.email}</p>
                        <p className="text-sm text-gray-500">
                          Role: {enrollment.user.role} | Status: {enrollment.status}
                        </p>
                        <p className="text-xs text-gray-400">
                          Joined: {new Date(enrollment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={
                            enrollment.status === 'ENROLLED' ? 'default' :
                            enrollment.status === 'INVITED' ? 'secondary' :
                            'outline'
                          }
                        >
                          {enrollment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Challenge Settings</CardTitle>
              <CardDescription>
                Manage challenge configuration and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Visibility</h3>
                  <Badge>Public</Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    This challenge is visible to all workspace participants
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Enrollment</h3>
                  <Badge variant="outline">Open</Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    Participants can freely join this challenge
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}