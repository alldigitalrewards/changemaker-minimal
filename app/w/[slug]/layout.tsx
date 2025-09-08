import { ReactNode } from "react"

interface WorkspaceLayoutProps {
  children: ReactNode
  params: Promise<{ slug: string }>
}

// Basic wrapper for workspace pages - actual layout is handled by admin/participant specific layouts
export default async function WorkspaceLayout({ 
  children 
}: WorkspaceLayoutProps) {
  return <>{children}</>
}