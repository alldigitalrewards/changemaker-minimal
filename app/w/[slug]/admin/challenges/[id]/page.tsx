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
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { prisma } from '@/lib/db';
import { DeleteChallengeButton } from './delete-button';
import { ChallengeActivities } from '@/components/activities/challenge-activities';

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