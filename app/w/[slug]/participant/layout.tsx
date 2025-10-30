import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import DashboardHeader from "@/components/layout/dashboard-header"
import { getUserBySupabaseId, getOrCreatePointsBalance } from "@/lib/db/queries"
import ParticipantSidebar from "@/components/navigation/participant-sidebar"
import { WorkspaceProvider } from "@/providers/workspace-provider"
import { getUserWorkspacesServer } from "@/app/lib/workspace-server"
import { ReactNode } from "react"

// Force dynamic rendering - this layout requires database access at request time
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Explicitly use Node.js runtime for Prisma

interface ParticipantLayoutProps {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function ParticipantLayout({ 
  children, 
  params 
}: ParticipantLayoutProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const role = await getUserWorkspaceRole(slug)
  if (!role) {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  // Points badge for participant
  const dbUser = await (async () => {
    const u = await getUserBySupabaseId(user.id)
    return u
  })()
  const balance = dbUser && workspace ? await getOrCreatePointsBalance(dbUser.id as any, workspace.id as any) : { totalPoints: 0, availablePoints: 0 }

  const header = (
    <DashboardHeader
      title="Dashboard"
      workspace={workspace}
      user={user}
      role="PARTICIPANT"
      showRoleSwitcher={role === "ADMIN"}
      pointsBadge={{ label: 'Activities completed', value: `${balance.totalPoints}` }}
    />
  )

  const sidebar = <ParticipantSidebar workspace={workspace} />

  // Get all user workspaces for the provider
  const userWorkspaces = await getUserWorkspacesServer()

  return (
    <WorkspaceProvider 
      initialWorkspace={workspace}
      initialRole="PARTICIPANT"
      initialWorkspaces={userWorkspaces}
    >
      <DashboardLayout
        header={header}
        sidebar={sidebar}
      >
        {children}
      </DashboardLayout>
    </WorkspaceProvider>
  )
}