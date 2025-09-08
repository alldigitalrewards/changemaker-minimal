import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import DashboardLayout from "@/components/layout/dashboard-layout"
import DashboardHeader from "@/components/layout/dashboard-header"
import ParticipantSidebar from "@/components/navigation/participant-sidebar"
import { ReactNode } from "react"

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

  const header = (
    <DashboardHeader
      title="Dashboard"
      workspace={workspace}
      user={user}
      role="PARTICIPANT"
      showRoleSwitcher={role === "ADMIN"}
    />
  )

  const sidebar = <ParticipantSidebar workspace={workspace} />

  return (
    <DashboardLayout
      header={header}
      sidebar={sidebar}
    >
      {children}
    </DashboardLayout>
  )
}