import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { revalidatePath } from 'next/cache'
import { StatusActions } from '../status-actions'
import { InlineEditor } from './inline-editor'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export default async function SettingsPage({ params }: PageProps) {
  const { slug, id } = await params
  const challenge = await prisma.challenge.findUnique({ where: { id } })

  if (!challenge) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Challenge not found</h3>
            <p className="text-gray-500">The challenge you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const now = new Date()
  const startDate = new Date(challenge.startDate)
  const enrollmentDeadline = challenge.enrollmentDeadline ? new Date(challenge.enrollmentDeadline) : null
  const enrollmentOpen = enrollmentDeadline ? now <= enrollmentDeadline : now <= startDate

  return (
    <div className="space-y-4">
      {/* Inline Editor for Challenge Details */}
      <InlineEditor
        challenge={{
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          startDate: challenge.startDate.toISOString(),
          endDate: challenge.endDate.toISOString(),
          enrollmentDeadline: challenge.enrollmentDeadline?.toISOString() || null,
          rewardType: challenge.rewardType,
          rewardConfig: challenge.rewardConfig,
          status: challenge.status,
          workspaceId: challenge.workspaceId,
        }}
        workspaceSlug={slug}
      />

      {/* Visibility & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>Control challenge publication status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge>{challenge.status === 'PUBLISHED' ? 'Public' : challenge.status === 'ARCHIVED' ? 'Archived' : 'Draft'}</Badge>
              <span className="text-sm text-gray-500">Use the controls to publish or unpublish.</span>
            </div>
            <StatusActions workspaceSlug={slug} challengeId={id} status={challenge.status} />
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Control */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollment</CardTitle>
          <CardDescription>Control participant enrollment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{enrollmentOpen ? 'Open' : 'Closed'}</Badge>
              <span className="text-sm text-gray-500">
                {enrollmentOpen
                  ? 'Participants can freely join this challenge'
                  : 'Enrollment is closed for this challenge'}
              </span>
            </div>
            <form
              action={async () => {
                'use server'
                const newDeadline = enrollmentOpen ? new Date() : startDate
                await prisma.challenge.update({ where: { id }, data: { enrollmentDeadline: newDeadline } })
                revalidatePath(`/w/${slug}/admin/challenges/${id}/settings`)
              }}
            >
              <Button variant="outline" type="submit">
                {enrollmentOpen ? 'Close Enrollment' : 'Reopen Enrollment'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


