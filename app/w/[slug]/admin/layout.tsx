import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import DashboardHeader from "@/components/layout/dashboard-header"
import AdminSidebar from "@/components/navigation/admin-sidebar"
import { ReactNode } from "react"

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
  if (!role || role !== "ADMIN") {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  const header = (
    <DashboardHeader
      title="Admin Dashboard"
      workspace={workspace}
      user={user}
      role="ADMIN"
      showRoleSwitcher={true}
    />
  )

  const sidebar = <AdminSidebar workspace={workspace} />

  return (
    <DashboardLayout
      header={header}
      sidebar={sidebar}
    >
      {children}
    </DashboardLayout>
  )
}