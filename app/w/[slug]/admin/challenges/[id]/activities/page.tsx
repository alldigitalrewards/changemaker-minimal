import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList } from 'lucide-react'
import { ChallengeActivities } from '@/components/activities/challenge-activities'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export default async function ActivitiesPage({ params }: PageProps) {
  const { slug, id } = await params
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: { Activity: true }
  })

  const hasActivities = !!(challenge?.Activity && challenge.Activity.length > 0)

  return (
    <div className="space-y-4">
      <ChallengeActivities challengeId={id} workspaceSlug={slug} />
    </div>
  )
}


