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
  Info,
  AlertTriangle,
  Bell,
  Settings
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { revalidatePath } from 'next/cache'
import { CommunicationComposer } from '@/components/communications/communication-composer'

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
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        enrollmentDeadline: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        emailEditAllowed: true,
        requireManagerApproval: true,
        requireAdminReapproval: true,
        rewardConfig: true,
        rewardType: true,
        Enrollment: {
          select: {
            id: true,
            userId: true,
            challengeId: true,
            status: true,
            enrolledAt: true,
            completedAt: true,
            totalPoints: true,
            createdAt: true,
            updatedAt: true,
            User: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                displayName: true,
              },
            },
          },
        },
        Activity: {
          select: {
            id: true,
            templateId: true,
            challengeId: true,
            pointsValue: true,
            maxSubmissions: true,
            deadline: true,
            isRequired: true,
            createdAt: true,
            updatedAt: true,
            position: true,
            rewardRules: true,
            ActivityTemplate: true,
            ActivitySubmission: {
              select: {
                id: true,
                activityId: true,
                userId: true,
                enrollmentId: true,
                textContent: true,
                fileUrls: true,
                linkUrl: true,
                submittedAt: true,
                status: true,
                pointsAwarded: true,
                reviewNotes: true,
                reviewedAt: true,
                reviewedBy: true,
                managerReviewedBy: true,
                managerReviewedAt: true,
                managerNotes: true,
                rewardIssuanceId: true,
                rewardIssued: true,
                updatedAt: true,
                User: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    displayName: true,
                  }
                },
                Enrollment: {
                  select: {
                    id: true,
                    userId: true,
                    challengeId: true,
                    status: true,
                    createdAt: true,
                  }
                },
              },
              orderBy: {
                submittedAt: 'desc'
              }
            }
          }
        },
        _count: {
          select: {
            Enrollment: true,
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

  const budget = await prisma.challengePointsBudget.findUnique({ where: { challengeId: id } });
  const workspaceBudget = await prisma.workspacePointsBudget.findUnique({ where: { workspaceId: challenge.workspaceId } });

  const enrolledUsers = challenge.Enrollment || [];
  const activeEnrollments = enrolledUsers.filter(e => e.status === 'ENROLLED').length;
  const completedEnrollments = enrolledUsers.filter(e => e.status === 'WITHDRAWN').length;
  
  // Calculate challenge status considering publish state first, then dates
  const now = new Date();
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);

  const statusForActions = ((challenge as any).status as (import('@/lib/auth/types').ChallengeStatus | undefined)) ?? 'DRAFT';

  let challengeStatus: string;
  let statusVariant: "default" | "secondary" | "destructive" | "outline";

  if (statusForActions === 'ARCHIVED') {
    challengeStatus = 'ARCHIVED';
    statusVariant = 'secondary';
  } else if (statusForActions !== 'PUBLISHED') {
    // Unpublished challenges should not show ACTIVE/UPCOMING/ENDED
    challengeStatus = 'DRAFT';
    statusVariant = 'outline';
  } else if (now < startDate) {
    challengeStatus = 'UPCOMING';
    statusVariant = 'outline';
  } else if (now >= startDate && now <= endDate) {
    challengeStatus = 'ACTIVE';
    statusVariant = 'default';
  } else {
    challengeStatus = 'ENDED';
    statusVariant = 'secondary';
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
  const totalSubmissions = (challenge.Activity || []).reduce((sum, a) => sum + (a.ActivitySubmission?.length || 0), 0);
  const approvedSubmissions = (challenge.Activity || []).reduce((sum, a) => sum + (a.ActivitySubmission?.filter(s => s.status === 'APPROVED').length || 0), 0);
  const completionPct = enrolledCount > 0 ? Math.round((approvedSubmissions / Math.max(enrolledCount, 1)) * 100) : 0;
  const avgScore = (() => {
    const approved = (challenge.Activity || []).flatMap(a => (a.ActivitySubmission || []).filter(s => s.status === 'APPROVED'));
    const pts = approved.map(s => s.pointsAwarded || 0);
    if (pts.length === 0) return 0;
    return Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
  })();
  const lastActivityAt = (() => {
    const all = (challenge.Activity || []).flatMap(a => a.ActivitySubmission || []);
    if (all.length === 0) return null;
    const latest = all.reduce((acc, s) => (acc && acc.submittedAt > s.submittedAt ? acc : s));
    return latest.submittedAt;
  })();
  const anySubmissions = (challenge.Activity || []).some(a => (a.ActivitySubmission || []).length > 0);

  // Attention metrics
  const pendingSubmissionCount = (challenge.Activity || []).reduce((sum, a) => sum + ((a.ActivitySubmission || []).filter(s => s.status === 'PENDING').length), 0)
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const stalledInvitesCount = enrolledUsers.filter(e => e.status === 'INVITED' && (now.getTime() - new Date((e as any).createdAt).getTime()) > sevenDaysMs).length
  const isUnpublished = statusForActions !== 'PUBLISHED'

  const activityOptions = (challenge.Activity || []).map(a => ({
    id: a.id,
    name: a.ActivityTemplate?.name || 'Activity'
  }))

  // Fetch timeline events (server-side)
  const events = await getChallengeEvents(id);

  const tabParam = typeof sp.tab === 'string' ? sp.tab : undefined
  // Back-compat: redirect ?tab=... to subroutes
  if (tabParam && ['activities','participants','settings','submissions','points','timeline'].includes(tabParam)) {
    // Prefer a server redirect to subroutes for back-compat with ?tab
    const { redirect } = await import('next/navigation')
    redirect(`/w/${slug}/admin/challenges/${id}/${tabParam}`)
  }

  return (
    <div className="space-y-6">
      {/* Header moved to shared layout; remove duplicate here */}

      {/* Consolidated Status Strip + Insights */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="md:col-span-6">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Badge variant={statusVariant}>{challengeStatus}</Badge>
            {now < startDate && (
              <span className="text-sm text-gray-700 flex items-center gap-1"><Clock className="h-4 w-4" /> Starts in {daysUntilStart} day{daysUntilStart === 1 ? '' : 's'}</span>
            )}
            {now >= startDate && now <= endDate && (
              <span className="text-sm text-gray-700 flex items-center gap-1"><Clock className="h-4 w-4" /> Ends in {daysUntilEnd} day{daysUntilEnd === 1 ? '' : 's'}</span>
            )}
            <span className="text-sm text-gray-700 flex items-center gap-1">
              <Calendar className="h-4 w-4" /> Enrollment {enrollmentOpen ? 'Open' : 'Closed'}{enrollmentDeadline ? ` — Enroll by ${format(enrollmentDeadline, 'MMM d, yyyy')}` : ''}
            </span>
            <span className="text-sm text-gray-700 flex items-center gap-1"><Info className="h-4 w-4" /> Visibility: Public</span>
            <span className="text-sm text-gray-700 flex items-center gap-1"><Info className="h-4 w-4" /> {statusForActions === 'PUBLISHED' ? 'Published' : statusForActions === 'ARCHIVED' ? 'Archived' : 'Draft'}</span>
          </CardContent>
        </Card>

        <Link href={`/w/${slug}/admin/challenges/${id}/participants?participants=invited`}>
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

        <Link href={`/w/${slug}/admin/challenges/${id}/participants?participants=enrolled`}>
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

        <Link href={`/w/${slug}/admin/challenges/${id}/activities`}>
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

        <Link href={`/w/${slug}/admin/challenges/${id}/activities`}>
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

      {/* Overview-only content (tabs moved to layout links) */}
      <div className="space-y-4">
          {((pendingSubmissionCount + stalledInvitesCount) > 0 || isUnpublished) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Attention</CardTitle>
                <CardDescription>Quick items that may need action</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingSubmissionCount > 0 && (
                    <div className="flex items-center justify-between p-3 border rounded-md bg-yellow-50">
                      <div className="flex items-center gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 text-amber-600" />
                        <span>{pendingSubmissionCount} submission{pendingSubmissionCount === 1 ? '' : 's'} awaiting review</span>
                      </div>
                      <Link href={`/w/${slug}/admin/challenges/${id}/submissions?status=pending`}>
                        <Button size="sm" variant="outline">Review now</Button>
                      </Link>
                    </div>
                  )}
                  {stalledInvitesCount > 0 && (
                    <div className="flex items-center justify-between p-3 border rounded-md bg-blue-50">
                      <div className="flex items-center gap-2 text-sm">
                        <Bell className="h-4 w-4 text-blue-600" />
                        <span>{stalledInvitesCount} invite{stalledInvitesCount === 1 ? '' : 's'} inactive for 7+ days</span>
                      </div>
                      <Link href={`?tab=participants&participants=invited`}>
                        <Button size="sm" variant="outline">Send reminders</Button>
                      </Link>
                    </div>
                  )}
                  {isUnpublished && (
                    <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                      <div className="flex items-center gap-2 text-sm">
                        <Info className="h-4 w-4 text-gray-600" />
                        <span>Challenge is not published</span>
                      </div>
                      <Link href={`?tab=settings`}>
                        <Button size="sm" variant="outline">Manage</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Challenge Description</CardTitle>
            </CardHeader>
            <CardContent>
              <details>
                <summary className="cursor-pointer text-sm text-gray-700 list-none">
                  <span className="[&_span.truncate]:block max-w-full"><span className="truncate inline-block align-top max-w-full">{challenge.description}</span></span>
                  <span className="text-coral-600 ml-1">Read more</span>
                </summary>
                <div className="mt-2 text-gray-700 whitespace-pre-line">{challenge.description}</div>
              </details>
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
                  ;(challenge.Activity || []).forEach(a => {
                    (a.ActivitySubmission || []).filter(s => s.status === 'APPROVED').forEach(s => {
                      const key = s.User.id
                      const pts = s.pointsAwarded || a.pointsValue || 0
                      if (!byUser[key]) byUser[key] = { email: s.User.email, points: 0 }
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="pt-2 border-t mt-2">
                  <div className="text-sm font-medium mb-1">Audit</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>Published by: {(challenge as any).publishedBy?.email || '—'}</div>
                    <div>Last editor: {(challenge as any).updatedBy?.email || '—'}</div>
                  </div>
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

            <Card>
              <CardHeader>
                <CardTitle>Send Communication</CardTitle>
                <CardDescription>Share updates with enrolled participants or specific activities.</CardDescription>
              </CardHeader>
              <CardContent>
                <CommunicationComposer
                  workspaceSlug={slug}
                  challengeId={id}
                  activities={activityOptions}
                  allowedScopes={activityOptions.length > 0 ? ['CHALLENGE', 'ACTIVITY'] : ['CHALLENGE']}
                  defaultScope={activityOptions.length > 0 ? 'CHALLENGE' : 'CHALLENGE'}
                />
              </CardContent>
            </Card>
          </div>
      </div>
    </div>
  );
}
