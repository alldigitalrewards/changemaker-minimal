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
  ClipboardList,
  PauseCircle,
  PlayCircle,
  Copy,
  Archive,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { prisma } from '@/lib/db';
import { getChallengeEvents } from '@/lib/db/queries';
import { DeleteChallengeButton } from './delete-button';
import { ChallengeActivities } from '@/components/activities/challenge-activities';
import { SubmissionReviewButton } from './submission-review-button';
import { DuplicateChallengeButton } from './duplicate-button';
import { ParticipantsBulkActions } from './participants-bulk-actions';
import { StatusActions } from './status-actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CopyLinkButton } from './copy-link-button'
import { Timeline } from './timeline'

interface PageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
  searchParams?: Promise<{ tab?: string }>
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

export default async function ChallengeDetailPage({ params, searchParams }: PageProps) {
  const { slug, id } = await params;
  const sp = (await (searchParams || Promise.resolve({} as any))) as any
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

  // Derived time info
  const msUntilStart = startDate.getTime() - now.getTime();
  const msUntilEnd = endDate.getTime() - now.getTime();
  const daysUntilStart = Math.ceil(msUntilStart / (1000 * 60 * 60 * 24));
  const daysUntilEnd = Math.ceil(msUntilEnd / (1000 * 60 * 60 * 24));
  const enrollmentDeadline = challenge.enrollmentDeadline ? new Date(challenge.enrollmentDeadline) : null;
  const enrollmentOpen = enrollmentDeadline ? now <= enrollmentDeadline : now <= startDate;

  // Compute quick metrics for insights
  const invitedCount = enrolledUsers.filter(e => e.status === 'INVITED').length;
  const enrolledCount = enrolledUsers.filter(e => e.status === 'ENROLLED').length;
  const totalSubmissions = (challenge.activities || []).reduce((sum, a) => sum + (a.submissions?.length || 0), 0);
  const approvedSubmissions = (challenge.activities || []).reduce((sum, a) => sum + (a.submissions?.filter(s => s.status === 'APPROVED').length || 0), 0);
  const completionPct = enrolledCount > 0 ? Math.round((approvedSubmissions / Math.max(enrolledCount, 1)) * 100) : 0;
  const avgScore = (() => {
    const approved = (challenge.activities || []).flatMap(a => (a.submissions || []).filter(s => s.status === 'APPROVED'));
    const pts = approved.map(s => s.pointsAwarded || 0);
    if (pts.length === 0) return 0;
    return Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
  })();
  const lastActivityAt = (() => {
    const all = (challenge.activities || []).flatMap(a => a.submissions || []);
    if (all.length === 0) return null;
    const latest = all.reduce((acc, s) => (acc && acc.submittedAt > s.submittedAt ? acc : s));
    return latest.submittedAt;
  })();
  const anySubmissions = (challenge.activities || []).some(a => (a.submissions || []).length > 0);
  const statusForActions = ((challenge as any).status as ('DRAFT'|'PUBLISHED'|'ARCHIVED'|undefined)) ?? 'DRAFT';

  // Fetch timeline events (server-side)
  const events = await getChallengeEvents(id);

  const tabParam = typeof sp.tab === 'string' ? sp.tab : undefined
  const defaultTab = tabParam && ['overview','activities','submissions','participants','settings'].includes(tabParam) ? tabParam : 'overview'

  return (
    <div className="space-y-6">
      {/* Header with status, countdowns and quick actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/w/${slug}/admin/challenges`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Challenges
              </Button>
            </Link>
            <Link href={`?tab=settings`}>
              <Badge role="link" className="cursor-pointer" variant={statusVariant} title="Go to Settings">
                {challengeStatus}
              </Badge>
            </Link>
            <Link href={`?tab=participants`}>
              {enrollmentOpen ? (
                <Badge role="link" className="cursor-pointer" variant="outline" title="Manage enrollment settings">
                  Enrollment Open
                </Badge>
              ) : (
                <Badge role="link" className="cursor-pointer" variant="secondary" title="Manage enrollment settings">
                  Enrollment Closed
                </Badge>
              )}
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-navy-900 mb-1">{challenge.title}</h1>
          <div className="text-sm text-gray-600 flex flex-wrap gap-4">
            {now < startDate && (
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Starts in {daysUntilStart} day{daysUntilStart === 1 ? '' : 's'}</span>
            )}
            {now >= startDate && now <= endDate && (
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Ends in {daysUntilEnd} day{daysUntilEnd === 1 ? '' : 's'}</span>
            )}
            {enrollmentDeadline && (
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Enroll by {format(enrollmentDeadline, 'MMM d, yyyy')}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyLinkButton href={`${process.env.NEXT_PUBLIC_APP_URL || ''}/w/${slug}/admin/challenges/${id}`} />
          <Link href={`/w/${slug}/admin/challenges/${id}/edit`}>
            <Button variant="outline" disabled={statusForActions === 'ARCHIVED'} title={statusForActions === 'ARCHIVED' ? 'Archived challenges are read-only' : undefined}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <DuplicateChallengeButton
            workspaceSlug={slug}
            sourceChallenge={{
              title: challenge.title,
              description: challenge.description,
              startDate: challenge.startDate,
              endDate: challenge.endDate,
              enrollmentDeadline: challenge.enrollmentDeadline || undefined
            }}
            sourceChallengeId={id}
            invitedParticipantIds={enrolledUsers.filter(e => e.status === 'INVITED').map(e => e.user.id)}
            enrolledParticipantIds={enrolledUsers.filter(e => e.status === 'ENROLLED').map(e => e.user.id)}
          />
          <StatusActions workspaceSlug={slug} challengeId={id} status={statusForActions} />
          <DeleteChallengeButton 
            challengeId={id}
            challengeTitle={challenge.title}
            workspaceSlug={slug}
          />
        </div>
      </div>

      {/* Insights Strip */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Link href={`?tab=participants`}>
        <Card className="cursor-pointer hover:bg-muted/40 transition-colors" aria-label="Invited participants metric" title="Total invited participants">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invited</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold">{invitedCount}</div>
                </TooltipTrigger>
                <TooltipContent>
                  Number of participants invited but not yet enrolled
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        </Link>

        <Link href={`?tab=participants`}>
        <Card className="cursor-pointer hover:bg-muted/40 transition-colors" aria-label="Enrolled participants metric" title="Current enrolled participants">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold">{enrolledCount}</div>
                </TooltipTrigger>
                <TooltipContent>
                  Participants currently enrolled in this challenge
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground">Current</p>
          </CardContent>
        </Card>
        </Link>

        <Link href={`?tab=submissions`}>
        <Card className="cursor-pointer hover:bg-muted/40 transition-colors" aria-label="Total submissions metric" title="Total submissions in this challenge">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold">{totalSubmissions}</div>
                </TooltipTrigger>
                <TooltipContent>
                  Total submissions received across all activities
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        </Link>

        <Link href={`?tab=submissions`}>
        <Card className="cursor-pointer hover:bg-muted/40 transition-colors" aria-label="Completion metric" title="Approved submissions per enrolled participant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold">{completionPct}%</div>
                </TooltipTrigger>
                <TooltipContent>
                  Percentage of enrolled participants with at least one approved submission
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground">Approved per enrolled</p>
          </CardContent>
        </Card>
        </Link>

        <Card aria-label="Average score metric" title="Average points per approved submission">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold">{avgScore}</div>
                </TooltipTrigger>
                <TooltipContent>
                  Average points awarded per approved submission
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground">Points per approved</p>
          </CardContent>
        </Card>

        <Card aria-label="Last activity metric" title="Most recent submission time">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {lastActivityAt ? format(new Date(lastActivityAt), 'MMM d, yyyy h:mm a') : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Most recent submission</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
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

          {/* Timeline + Mini Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
                <CardDescription>Chronological activity</CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-600">No activity yet</p>
                  </div>
                ) : (
                  <Timeline events={events as any} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Participants</CardTitle>
                <CardDescription>Leaderboard snapshot</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // compute points per user in this challenge similar to API util
                  const byUser: Record<string, { email: string; points: number }> = {}
                  ;(challenge.activities || []).forEach(a => {
                    (a.submissions || []).filter(s => s.status === 'APPROVED').forEach(s => {
                      const key = s.user.id
                      const pts = s.pointsAwarded || a.pointsValue || 0
                      if (!byUser[key]) byUser[key] = { email: s.user.email, points: 0 }
                      byUser[key].points += pts
                    })
                  })
                  const top = Object.entries(byUser)
                    .map(([id, v]) => ({ id, ...v }))
                    .sort((a, b) => b.points - a.points)
                    .slice(0, 5)
                  if (top.length === 0) {
                    return <div className="text-sm text-gray-600">No leaderboard yet</div>
                  }
                  return (
                    <div className="space-y-2">
                      {top.map((t, idx) => (
                        <div key={t.id} className="flex items-center justify-between border rounded p-2">
                          <div className="text-sm font-medium">#{idx + 1} {t.email.split('@')[0]}</div>
                          <div className="text-sm">{t.points} pts</div>
                        </div>
                      ))}
                      <Link href={`/w/${slug}/participant/leaderboard`} className="inline-block mt-2">
                        <Button size="sm" variant="outline">View full leaderboard</Button>
                      </Link>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

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
                <Link href={`/w/${slug}/participant/leaderboard`}>
                  <Button className="w-full" variant="outline">
                    <Trophy className="h-4 w-4 mr-2" />
                    View Leaderboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          {(challenge.activities && challenge.activities.length > 0) ? (
            <ChallengeActivities challengeId={id} workspaceSlug={slug} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No activities yet</CardTitle>
                <CardDescription>
                  Create activities to define tasks participants can complete for points.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/w/${slug}/admin/challenges/${id}/edit`}>
                  <Button>
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Add Activities
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
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
              {anySubmissions ? (
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
                <div className="text-center py-12">
                  <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">No submissions yet</h3>
                  <p className="text-gray-500 mb-4">Once participants submit, they will appear here for review.</p>
                  <Link href={`/w/${slug}/admin/challenges/${id}/edit`}>
                    <Button variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Participants
                    </Button>
                  </Link>
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
                  <ParticipantsBulkActions
                    workspaceSlug={slug}
                    challengeId={id}
                    enrollments={enrolledUsers as any}
                  />
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
                  <Badge variant="outline">{enrollmentOpen ? 'Open' : 'Closed'}</Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    Participants can freely join this challenge
                  </p>
                </div>
                <div>
                  <Link href={`/w/${slug}/admin/challenges/${id}/edit`}>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}