import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace, getUserWorkspaceRole } from '@/lib/workspace-context'
import { prisma } from '@/lib/prisma'
import { ActivityTemplatesClient } from './activity-templates-client'

interface ActivityTemplatesPageProps {
  params: Promise<{ slug: string }>
}

export default async function ActivityTemplatesPage({ params }: ActivityTemplatesPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== 'ADMIN') {
    redirect('/workspaces')
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect('/workspaces')
  }

  // Fetch activity templates with usage counts
  const templates = await prisma.activityTemplate.findMany({
    where: {
      workspaceId: workspace.id,
    },
    include: {
      _count: {
        select: {
          Activity: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Get activity stats
  const totalActivities = await prisma.activity.count({
    where: {
      Challenge: {
        workspaceId: workspace.id,
      },
    },
  })

  const activeActivities = await prisma.activity.count({
    where: {
      Challenge: {
        workspaceId: workspace.id,
        status: 'PUBLISHED',
      },
    },
  })

  const pendingSubmissions = await prisma.activitySubmission.count({
    where: {
      Activity: {
        Challenge: {
          workspaceId: workspace.id,
        },
      },
      status: 'PENDING',
    },
  })

  return (
    <ActivityTemplatesClient
      workspace={workspace}
      templates={templates}
      totalActivities={totalActivities}
      activeActivities={activeActivities}
      pendingSubmissions={pendingSubmissions}
    />
  )
}