import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import DashboardHeader from "@/components/layout/dashboard-header"
import { getWorkspacePointsBudget } from "@/lib/db/queries"
import AdminSidebar from "@/components/navigation/admin-sidebar"
import { WorkspaceProvider } from "@/providers/workspace-provider"
import { getUserWorkspacesServer } from "@/app/lib/workspace-server"
import { isPlatformSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/prisma"
import { ReactNode } from "react"

// Force dynamic rendering - this layout requires database access at request time
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Explicitly use Node.js runtime for Prisma

interface AdminLayoutProps {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function AdminLayout({ 
  children, 
  params 
}: AdminLayoutProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const role = await getUserWorkspaceRole(slug)
  if (!role || (role !== "ADMIN" && role !== "MANAGER")) {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  const budget = await getWorkspacePointsBudget(workspace.id)

  // Check if user is platform superadmin
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! }
  })
  const isSuperAdmin = isPlatformSuperAdmin(dbUser?.permissions, user.email!)

  const header = (
    <DashboardHeader
      title="Admin Dashboard"
      workspace={workspace}
      user={user}
      role={role}
      showRoleSwitcher={true}
      budgetBadge={budget ? { label: 'Budget', value: `${Math.max(0, (budget.totalBudget || 0) - (budget.allocated || 0))}/${budget.totalBudget || 0}` } : undefined}
    />
  )

  const sidebar = <AdminSidebar workspace={workspace} isSuperAdmin={isSuperAdmin} />

  // Get all user workspaces for the provider
  const userWorkspaces = await getUserWorkspacesServer()

  return (
    <WorkspaceProvider 
      initialWorkspace={workspace}
      initialRole="ADMIN"
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