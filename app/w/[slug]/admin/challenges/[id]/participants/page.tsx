import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, UserPlus } from 'lucide-react'
import { ParticipantsBulkActions } from '../participants-bulk-actions'
import ParticipantsManager from './ParticipantsManager'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
  searchParams?: Promise<{ participants?: string }>
}

export default async function ParticipantsPage({ params, searchParams }: PageProps) {
  const { slug, id } = await params
  const sp = (await (searchParams || Promise.resolve({} as any))) as any
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      Enrollment: {
        include: {
          User: { select: { id: true, email: true, role: true } }
        }
      }
    }
  })

  const enrolledUsers = challenge?.Enrollment || []
  const invitedCount = enrolledUsers.filter(e => e.status === 'INVITED').length
  const enrolledCount = enrolledUsers.filter(e => e.status === 'ENROLLED').length
  const participantsFilterParam = typeof sp.participants === 'string' ? (sp.participants as string).toLowerCase() : undefined

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Challenge Participants</CardTitle>
              <CardDescription>
                {enrolledUsers.length} total participants (invited + enrolled)
              </CardDescription>
            </div>
            <div />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Link href={`/w/${slug}/admin/challenges/${id}/participants`}>
              <Button size="sm" variant={!participantsFilterParam ? 'default' : 'outline'}>
                All ({enrolledUsers.length})
              </Button>
            </Link>
            <Link href={`/w/${slug}/admin/challenges/${id}/participants?participants=enrolled`}>
              <Button size="sm" variant={participantsFilterParam === 'enrolled' ? 'default' : 'outline'}>
                Enrolled ({enrolledCount})
              </Button>
            </Link>
            <Link href={`/w/${slug}/admin/challenges/${id}/participants?participants=invited`}>
              <Button size="sm" variant={participantsFilterParam === 'invited' ? 'default' : 'outline'}>
                Invited ({invitedCount})
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <ParticipantsManager
              workspaceSlug={slug}
              challengeId={id}
              initialInvitedIds={enrolledUsers.filter(e => e.status === 'INVITED').map(e => e.User.id)}
              initialEnrolledIds={enrolledUsers.filter(e => e.status === 'ENROLLED').map(e => e.User.id)}
              challengeTitle={challenge?.title || ''}
              challengeDescription={challenge?.description || ''}
              startDate={challenge ? new Date(challenge.startDate).toISOString() : ''}
              endDate={challenge ? new Date(challenge.endDate).toISOString() : ''}
              enrollmentDeadline={challenge?.enrollmentDeadline ? new Date(challenge.enrollmentDeadline).toISOString() : null}
            />

            <div className="space-y-4">
              <ParticipantsBulkActions
                workspaceSlug={slug}
                challengeId={id}
                enrollments={enrolledUsers as any}
              />
              {(() => {
                const statusFilter = participantsFilterParam === 'enrolled' ? 'ENROLLED' : participantsFilterParam === 'invited' ? 'INVITED' : undefined
                const list = statusFilter ? enrolledUsers.filter(e => e.status === statusFilter) : enrolledUsers
                return list.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{enrollment.User.email}</p>
                    <p className="text-sm text-gray-500">
                      Role: {enrollment.User.role} | Status: {enrollment.status}
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
                ))
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


