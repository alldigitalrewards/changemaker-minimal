import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserBySupabaseId, getWorkspaceBySlug, verifyWorkspaceAccess } from '@/lib/db/queries'
import { getUserNotifications } from '@/lib/db/notifications'
import { NotificationInbox } from '@/components/notifications/notification-inbox'

export const dynamic = 'force-dynamic'

interface NotificationsPageProps {
  params: Promise<{ slug: string }>
}

export default async function NotificationsPage({ params }: NotificationsPageProps) {
  const { slug } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get workspace
  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) {
    redirect('/workspaces')
  }

  // Get user
  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) {
    redirect('/auth/login')
  }

  // Verify access
  const hasAccess = await verifyWorkspaceAccess(dbUser.id, workspace.id)
  if (!hasAccess) {
    redirect('/workspaces')
  }

  // Fetch initial notifications (unread)
  const notifications = await getUserNotifications(dbUser.id, workspace.id, {
    includeRead: false,
    includeDismissed: false,
    limit: 50,
  })

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-600 mt-2">
          Stay updated on your challenges, rewards, and activities
        </p>
      </div>

      <NotificationInbox
        workspaceSlug={slug}
        initialNotifications={notifications}
      />
    </div>
  )
}
