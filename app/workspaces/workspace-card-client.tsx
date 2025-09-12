"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import JoinWorkspaceDialog from "./join-workspace-dialog"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { setPrimaryWorkspace, leaveWorkspace } from "./actions"

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

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (dashboardPath && !isLoading) {
      router.push(dashboardPath)
    }
  }

  const handleSetPrimary = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId || isPrimary || isLoading) return
    
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

  const handleLeave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId || isPrimary || isLoading || isOwner) return
    
    if (!confirm(`Are you sure you want to leave "${workspace.name}"?`)) {
      return
    }
    
    setIsLoading(true)
    try {
      const result = await leaveWorkspace(userId, workspace.id)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Failed to leave workspace')
      }
    } catch (error) {
      console.error('Error leaving workspace:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow",
        isUserWorkspace && "cursor-pointer hover:border-coral-500/50",
        isPrimary && "ring-2 ring-coral-200"
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {workspace.name}
              {isPrimary && (
                <span className="text-xs bg-coral-100 text-coral-700 px-2 py-1 rounded font-medium">
                  Primary
                </span>
              )}
              {isOwner && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                  Owner
                </span>
              )}
            </CardTitle>
            <CardDescription>/{workspace.slug}</CardDescription>
          </div>
          {isUserWorkspace && userRole === 'ADMIN' && (
            <div className="text-xs text-coral-600 font-medium bg-coral-50 px-2 py-1 rounded">
              Admin
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-1 text-gray-600">
          <p>{workspace._count.users} members</p>
          <p>{workspace._count.challenges} challenges</p>
        </div>
        {isUserWorkspace ? (
          <div className="mt-3 space-y-2">
            <Button 
              variant="default" 
              className="w-full"
              onClick={handleButtonClick}
              disabled={isLoading}
            >
              Go to Dashboard
            </Button>
            
            <div className="flex gap-2">
              {!isPrimary && !isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetPrimary}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Setting...' : 'Set as Primary'}
                </Button>
              )}
              
              {!isPrimary && !isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeave}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isLoading ? 'Leaving...' : 'Leave'}
                </Button>
              )}
            </div>
          </div>
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