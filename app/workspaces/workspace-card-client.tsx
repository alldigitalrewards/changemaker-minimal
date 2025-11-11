"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import JoinWorkspaceDialog from "./join-workspace-dialog"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { setPrimaryWorkspace } from "./actions"
import { Star, Users as UsersIcon, Trophy, Crown, ArrowRight, Shield, UserCheck } from "lucide-react"

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click if clicking on interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) {
      return
    }
    
    if (isUserWorkspace && dashboardPath && !isLoading) {
      router.push(dashboardPath)
    }
  }

  const handleSetPrimary = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
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
        "group relative min-h-[260px] flex flex-col border transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-gray-500/10",
        isUserWorkspace && [
          "cursor-pointer",
          "hover:border-gray-300 hover:-translate-y-2",
          "hover:bg-gradient-to-br hover:from-white hover:to-gray-50/20"
        ],
        isPrimary && [
          "ring-2 ring-gray-900-400/60 shadow-lg shadow-gray-500/10",
          "border-gray-300 bg-gradient-to-br from-white to-gray-50/40"
        ]
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                {workspace.name}
              </CardTitle>
              {isOwner && (
                <div title="Primary Workspace Owner">
                  <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <CardDescription className="text-sm text-gray-600">
                /{workspace.slug}
              </CardDescription>
              
              {/* Role Badge */}
              {isUserWorkspace && userRole && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-medium transition-colors flex items-center gap-1",
                    userRole === 'ADMIN' && [
                      "bg-blue-100 text-blue-800 border-blue-200",
                      "hover:bg-blue-200"
                    ],
                    userRole === 'MANAGER' && [
                      "bg-amber-100 text-amber-800 border-amber-200",
                      "hover:bg-amber-200"
                    ],
                    userRole === 'PARTICIPANT' && [
                      "bg-gray-100 text-gray-800 border-gray-200",
                      "hover:bg-gray-200"
                    ]
                  )}
                >
                  {userRole === 'ADMIN' && <Shield className="h-3 w-3" />}
                  {userRole === 'MANAGER' && <UsersIcon className="h-3 w-3" />}
                  {userRole === 'PARTICIPANT' && <UserCheck className="h-3 w-3" />}
                  {userRole === 'ADMIN' ? 'ADMIN' : userRole === 'MANAGER' ? 'MANAGER' : 'PARTICIPANT'}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Primary workspace star icon */}
          {isUserWorkspace && userId && (
            <button
              onClick={handleSetPrimary}
              disabled={isLoading}
              className={cn(
                "p-2 rounded-full transition-all duration-200 flex-shrink-0",
                "hover:bg-gray-50 hover:scale-110",
                isPrimary 
                  ? "text-gray-900 bg-gray-50/50" 
                  : "text-gray-300 hover:text-gray-400",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              title={isPrimary ? "Primary workspace" : "Set as primary"}
              aria-label={isPrimary ? "Primary workspace" : "Set as primary workspace"}
            >
              <Star 
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  isPrimary && "fill-current scale-110"
                )} 
              />
            </button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 pt-2">
        {/* Workspace stats with enhanced styling */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg border border-gray-200/50">
            <UsersIcon className="h-4 w-4 text-gray-900" />
            <span className="text-sm font-semibold text-gray-900">{workspace._count.users}</span>
            <span className="text-xs text-gray-900/80 font-medium">members</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-terracotta-50 to-terracotta-100/50 rounded-lg border border-terracotta-200/50">
            <Trophy className="h-4 w-4 text-terracotta-600" />
            <span className="text-sm font-semibold text-terracotta-800">{workspace._count.challenges}</span>
            <span className="text-xs text-terracotta-600/80 font-medium">challenges</span>
          </div>
        </div>
        
        {/* Action area */}
        <div className="mt-auto">
          {!isUserWorkspace ? (
            <JoinWorkspaceDialog 
              userId={userId} 
              workspaceId={workspace.id}
              workspaceName={workspace.name}
            />
          ) : (
            <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50/50 rounded-lg p-3 group-hover:bg-gray-50/30 transition-colors">
              <span>Click to enter workspace</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}