import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace, getUserWorkspaceRole } from '@/lib/workspace-context'
import { EmailsPageClient } from './EmailsPageClient'

interface EmailsPageProps {
  params: Promise<{ slug: string }>
}

export default async function EmailsPage({ params }: EmailsPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== 'ADMIN') redirect('/workspaces')

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) redirect('/workspaces')

  return (
    <EmailsPageClient
      slug={slug}
      workspaceName={workspace.name}
      userEmail={user.email || ''}
    />
  )
}
