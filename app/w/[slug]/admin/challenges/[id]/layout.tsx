import Link from 'next/link'
import { format } from 'date-fns'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Info, Users, Activity, Settings, Trophy, Clock, ClipboardList } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string; id: string }>
}

async function getChallengeHeader(slug: string, id: string) {
  const challenge = await prisma.challenge.findFirst({
    where: { id, workspace: { slug } },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      enrollmentDeadline: true,
      status: true,
      workspace: { select: { id: true } },
      _count: { select: { enrollments: true, activities: true } }
    }
  })
  return challenge
}

export default async function ChallengeAdminLayout({ children, params }: LayoutProps) {
  const { slug, id } = await params
  const challenge = await getChallengeHeader(slug, id)

  if (!challenge) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href={`/w/${slug}/admin/challenges`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Challenges
            </Button>
          </Link>
        </div>
        <div className="text-sm text-gray-600">Challenge not found.</div>
      </div>
    )
  }

  const now = new Date()
  const startDate = new Date(challenge.startDate)
  const endDate = new Date(challenge.endDate)
  const enrollmentDeadline = challenge.enrollmentDeadline ? new Date(challenge.enrollmentDeadline) : null
  const enrollmentOpen = enrollmentDeadline ? now <= enrollmentDeadline : now <= startDate
  const statusForActions = (challenge.status as any) || 'DRAFT'

  let challengeStatus: string
  let statusVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  if (statusForActions === 'ARCHIVED') {
    challengeStatus = 'ARCHIVED'
    statusVariant = 'secondary'
  } else if (statusForActions !== 'PUBLISHED') {
    challengeStatus = 'DRAFT'
    statusVariant = 'outline'
  } else if (now < startDate) {
    challengeStatus = 'UPCOMING'
    statusVariant = 'outline'
  } else if (now >= startDate && now <= endDate) {
    challengeStatus = 'ACTIVE'
    statusVariant = 'default'
  } else {
    challengeStatus = 'ENDED'
    statusVariant = 'secondary'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 sticky top-0 z-30 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 py-3 -mx-4 px-4 border-b">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/w/${slug}/admin/challenges`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Challenges
              </Button>
            </Link>
            <Link href={`/w/${slug}/admin/challenges/${id}/settings`}>
              <Badge role="link" className="cursor-pointer" variant={statusVariant} title="Go to Settings">
                {challengeStatus}
              </Badge>
            </Link>
            <Badge variant={enrollmentOpen ? 'outline' : 'secondary'} title="Enrollment status">
              {enrollmentOpen ? 'Enrollment Open' : 'Enrollment Closed'}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-navy-900 mb-1">{challenge.title}</h1>
          <div className="text-sm text-gray-600 flex flex-wrap gap-4">
            <span>Start: {format(startDate, 'MMM d, yyyy')}</span>
            <span>End: {format(endDate, 'MMM d, yyyy')}</span>
            {enrollmentDeadline && <span>Enroll by {format(enrollmentDeadline, 'MMM d, yyyy')}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${process.env.NEXT_PUBLIC_APP_URL || ''}/w/${slug}/admin/challenges/${id}`}>
            <Button variant="outline">
              <Info className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </Link>
          <Link href={`/w/${slug}/admin/challenges/${id}/edit`}>
            <Button variant="outline" title={statusForActions === 'ARCHIVED' ? 'Archived challenges are read-only' : undefined} disabled={statusForActions === 'ARCHIVED'}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <nav className="-mx-4 px-4 border-b bg-white sticky top-[52px] z-20">
        <ul className="flex flex-wrap gap-2 py-2">
          <li>
            <Link href={`/w/${slug}/admin/challenges/${id}`} className="text-sm inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-muted/50">
              <Info className="h-4 w-4" /> Overview
            </Link>
          </li>
          <li>
            <Link href={`/w/${slug}/admin/challenges/${id}/leaderboard`} className="text-sm inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-muted/50">
              <Trophy className="h-4 w-4" /> Leaderboard
            </Link>
          </li>
          <li>
            <Link href={`/w/${slug}/admin/challenges/${id}/participants`} className="text-sm inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-muted/50">
              <Users className="h-4 w-4" /> Participants
            </Link>
          </li>
          <li>
            <Link href={`/w/${slug}/admin/challenges/${id}/activities`} className="text-sm inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-muted/50">
              <Activity className="h-4 w-4" /> Activities
            </Link>
          </li>
          <li>
            <Link href={`/w/${slug}/admin/challenges/${id}/submissions`} className="text-sm inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-muted/50">
              <ClipboardList className="h-4 w-4" /> Submissions
            </Link>
          </li>
          <li>
            <Link href={`/w/${slug}/admin/challenges/${id}/points`} className="text-sm inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-muted/50">
              <Trophy className="h-4 w-4" /> Points
            </Link>
          </li>
          <li>
            <Link href={`/w/${slug}/admin/challenges/${id}/settings`} className="text-sm inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-muted/50">
              <Settings className="h-4 w-4" /> Settings
            </Link>
          </li>
          <li>
            <Link href={`/w/${slug}/admin/challenges/${id}/timeline`} className="text-sm inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-muted/50">
              <Clock className="h-4 w-4" /> Timeline
            </Link>
          </li>
        </ul>
      </nav>

      <div>{children}</div>
    </div>
  )
}

