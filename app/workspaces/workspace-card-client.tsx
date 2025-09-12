"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import JoinWorkspaceDialog from "./join-workspace-dialog"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { setPrimaryWorkspace } from "./actions"
import { Star, Users, Trophy, Crown } from "lucide-react"

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
  isPrimary?: boolean
}

export default function WorkspaceCard({ 
  workspace, 
  isUserWorkspace, 
  userId, 
  userRole,
  isPrimary = false
}: WorkspaceCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const isOwner = isPrimary && userRole === 'ADMIN'
  const dashboardPath = isUserWorkspace && userRole
    ? `/w/${workspace.slug}/${userRole.toLowerCase()}/dashboard`
    : null

  const handleCardClick = () => {
    if (isUserWorkspace && dashboardPath && !isLoading) {
      router.push(dashboardPath)
    }
  }

  const handleSetPrimary = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId || isLoading) return
    
    setIsLoading(true)
    try {
      const result = await setPrimaryWorkspace(userId, workspace.id)
      if (result.success) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error setting primary workspace:', error)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <Card 
      className={cn(
        "hover:shadow-lg transition-all duration-200 min-h-[240px] flex flex-col relative border-gray-200",
        isUserWorkspace && "cursor-pointer hover:border-coral-400 hover:-translate-y-1",
        isPrimary && "ring-2 ring-coral-300 shadow-xl border-coral-200 bg-gradient-to-br from-white to-coral-50/30"
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 mb-1">
              <span className="truncate">{workspace.name}</span>
              {isOwner && (
                <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" title="Owner" />
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <span>/{workspace.slug}</span>
              {isUserWorkspace && userRole === 'ADMIN' && !isOwner && (
                <span className="text-xs text-coral-600 font-medium bg-coral-50 px-1.5 py-0.5 rounded ml-2">
                  Admin
                </span>
              )}
            </CardDescription>
          </div>
          
          {/* Primary workspace star icon */}
          {isUserWorkspace && userId && (
            <button
              onClick={handleSetPrimary}
              disabled={isLoading}
              className={cn(
                "p-1.5 rounded-full transition-colors hover:bg-gray-100 flex-shrink-0",
                isPrimary 
                  ? "text-coral-500 hover:text-coral-600" 
                  : "text-gray-300 hover:text-coral-400"
              )}
              title={isPrimary ? "Primary workspace" : "Set as primary"}
              aria-label={isPrimary ? "Primary workspace" : "Set as primary workspace"}
            >
              <Star 
                className={cn(
                  "h-5 w-5 transition-colors",
                  isPrimary && "fill-current"
                )} 
              />
            </button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1">
        {/* Workspace stats with enhanced styling */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md">
            <Users className="h-4 w-4 text-coral-500" />
            <span className="text-sm font-medium text-gray-700">{workspace._count.users}</span>
            <span className="text-xs text-gray-500">members</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">{workspace._count.challenges}</span>
            <span className="text-xs text-gray-500">challenges</span>
          </div>
        </div>
        
        <div className="mt-auto">
          {!isUserWorkspace && (
            <JoinWorkspaceDialog 
              userId={userId} 
              workspaceId={workspace.id}
              workspaceName={workspace.name}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}