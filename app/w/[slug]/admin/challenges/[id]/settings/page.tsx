import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { StatusActions } from '../status-actions'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export default async function SettingsPage({ params }: PageProps) {
  const { slug, id } = await params
  const challenge = await prisma.challenge.findUnique({ where: { id } })
  const workspaceId = (await prisma.challenge.findUnique({ where: { id }, select: { workspaceId: true } }))?.workspaceId || ''

  const now = new Date()
  const startDate = challenge ? new Date(challenge.startDate) : new Date()
  const enrollmentDeadline = challenge?.enrollmentDeadline ? new Date(challenge.enrollmentDeadline) : null
  const enrollmentOpen = enrollmentDeadline ? now <= enrollmentDeadline : now <= startDate

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Challenge Settings</CardTitle>
          <CardDescription>
            Manage challenge configuration and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Visibility</h3>
              <div className="flex items-center gap-2">
                <Badge>{(challenge as any)?.status === 'PUBLISHED' ? 'Public' : (challenge as any)?.status === 'ARCHIVED' ? 'Archived' : 'Draft'}</Badge>
                <span className="text-sm text-gray-500">Use the controls to publish or unpublish.</span>
              </div>
              <StatusActions workspaceSlug={slug} challengeId={id} status={(challenge as any)?.status || 'DRAFT'} />
            </div>
            <div>
              <h3 className="font-medium mb-2">Enrollment</h3>
              <Badge variant="outline">{enrollmentOpen ? 'Open' : 'Closed'}</Badge>
              <p className="text-sm text-gray-500 mt-1">
                Participants can freely join this challenge
              </p>
              <form
                action={async () => {
                  'use server'
                  const newDeadline = enrollmentOpen ? new Date() : startDate
                  await prisma.challenge.update({ where: { id }, data: { enrollmentDeadline: newDeadline } })
                  revalidatePath(`/w/${slug}/admin/challenges/${id}/settings`)
                }}
                className="mt-2"
              >
                <Button variant="outline" type="submit">
                  {enrollmentOpen ? 'Close Enrollment' : 'Reopen Enrollment'}
                </Button>
              </form>
            </div>

            {/* Points Budget removed from Settings; use the Points tab instead */}
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
    </div>
  )
}


