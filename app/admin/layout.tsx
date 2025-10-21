import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isPlatformSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/prisma"
import DashboardLayout from "@/components/layout/dashboard-layout"
import DashboardHeader from "@/components/layout/dashboard-header"
import PlatformAdminSidebar from "@/components/navigation/platform-admin-sidebar"
import { ReactNode } from "react"

interface PlatformAdminLayoutProps {
  children: ReactNode
}

export default async function PlatformAdminLayout({
  children
}: PlatformAdminLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is platform superadmin
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! }
  })

  const isSuperAdmin = isPlatformSuperAdmin(dbUser?.permissions, user.email!)

  if (!isSuperAdmin) {
    redirect("/workspaces")
  }

  const header = (
    <DashboardHeader
      title="Platform Administration"
      workspace={{ name: 'Platform Admin', slug: 'admin' }}
      user={user}
      role="ADMIN"
      showRoleSwitcher={false}
      showWorkspaceSwitcher={false}
      isGlobalPage={true}
    />
  )

  const sidebar = <PlatformAdminSidebar />

  return (
    <DashboardLayout
      header={header}
      sidebar={sidebar}
    >
      {children}
    </DashboardLayout>
  )
}
