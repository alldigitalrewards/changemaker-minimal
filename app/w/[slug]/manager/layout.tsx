import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import DashboardHeader from "@/components/layout/dashboard-header"
import { getWorkspacePointsBudget } from "@/lib/db/queries"
import ManagerSidebar from "@/components/navigation/manager-sidebar"
import { WorkspaceProvider } from "@/providers/workspace-provider"
import { getUserWorkspacesServer } from "@/app/lib/workspace-server"
import { ReactNode } from "react"

// Force dynamic rendering - this layout requires database access at request time
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Explicitly use Node.js runtime for Prisma

interface ManagerLayoutProps {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function ManagerLayout({
  children,
  params
}: ManagerLayoutProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const role = await getUserWorkspaceRole(slug)
  if (!role || !["ADMIN", "MANAGER"].includes(role)) {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  const header = (
    <DashboardHeader
      title="Manager Dashboard"
      workspace={workspace}
      user={user}
      role={role}
      showRoleSwitcher={true}
    />
  )

  const sidebar = <ManagerSidebar workspace={workspace} />

  // Get all user workspaces for the provider
  const userWorkspaces = await getUserWorkspacesServer()

  return (
    <WorkspaceProvider
      initialWorkspace={workspace}
      initialRole="MANAGER"
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
