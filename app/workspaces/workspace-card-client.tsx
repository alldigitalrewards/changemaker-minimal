"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import JoinWorkspaceDialog from "./join-workspace-dialog"
import { useRouter } from "next/navigation"

interface WorkspaceCardProps {
  workspace: {
    id: string
    name: string
    slug: string
    _count: {
      users: number
      challenges: number
    }
  }
  isUserWorkspace: boolean
  userId?: string
  userRole?: string
}

export default function WorkspaceCard({ 
  workspace, 
  isUserWorkspace, 
  userId, 
  userRole 
}: WorkspaceCardProps) {
  const router = useRouter()
  const dashboardPath = isUserWorkspace && userRole
    ? `/w/${workspace.slug}/${userRole.toLowerCase()}/dashboard`
    : null

  const handleCardClick = () => {
    if (isUserWorkspace && dashboardPath) {
      router.push(dashboardPath)
    }
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (dashboardPath) {
      router.push(dashboardPath)
    }
  }

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow",
        isUserWorkspace && "cursor-pointer hover:border-coral-500/50"
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{workspace.name}</CardTitle>
        <CardDescription>/{workspace.slug}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-1 text-gray-600">
          <p>{workspace._count.users} members</p>
          <p>{workspace._count.challenges} challenges</p>
        </div>
        {isUserWorkspace ? (
          <Button 
            variant="outline" 
            className="mt-3 w-full"
            onClick={handleButtonClick}
          >
            Go to Dashboard
          </Button>
        ) : (
          <JoinWorkspaceDialog 
            userId={userId} 
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            className="mt-3"
          />
        )}
      </CardContent>
    </Card>
  )
}