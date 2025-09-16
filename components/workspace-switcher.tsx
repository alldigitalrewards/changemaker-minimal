'use client'

/**
 * Workspace Switcher Component
 * 
 * Minimal dropdown for switching between workspaces.
 * Only shown to users with multiple workspace memberships.
 */

import React, { useState } from 'react'
import { ChevronDown, Building, Crown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWorkspace } from '@/providers/workspace-provider'
import { type Workspace } from '@/lib/types'

interface WorkspaceSwitcherProps {
  className?: string
}

export default function WorkspaceSwitcher({ 
  className 
}: WorkspaceSwitcherProps = {}) {
  const { currentWorkspace, availableWorkspaces, isSwitching, switchWorkspace } = useWorkspace()
  const [isOpen, setIsOpen] = useState(false)

  // Only show switcher if user has multiple workspaces
  if (availableWorkspaces.length <= 1) {
    return null
  }

  const handleSwitchWorkspace = async (slug: string) => {
    if (slug === currentWorkspace?.slug || isSwitching) return
    
    setIsOpen(false)
    await switchWorkspace(slug)
  }

  const isPrimary = (workspace: Workspace) => {
    // Check if this workspace is marked as primary (if that field exists)
    return (workspace as any).isPrimary === true
  }

  return (
    <div className={className}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2 min-w-0"
            disabled={isSwitching}
          >
            <Building className="h-4 w-4 flex-shrink-0" />
            <span className="truncate max-w-32">
              {currentWorkspace?.name || 'Select Workspace'}
            </span>
            {isSwitching ? (
              <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
            ) : (
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
            Switch Workspace
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {availableWorkspaces.map((workspace) => {
            const isCurrentWorkspace = workspace.slug === currentWorkspace?.slug
            const isWorkspacePrimary = isPrimary(workspace)

            return (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleSwitchWorkspace(workspace.slug)}
                disabled={isCurrentWorkspace || isSwitching}
                className={`flex items-center gap-3 p-3 cursor-pointer ${
                  isCurrentWorkspace ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm font-medium ${
                        isCurrentWorkspace ? 'text-coral-600' : 'text-gray-900'
                      }`}>
                        {workspace.name}
                      </span>
                      {isWorkspacePrimary && (
                        <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      /{workspace.slug}
                    </p>
                  </div>
                </div>
                {isCurrentWorkspace && (
                  <div className="text-xs text-coral-600 font-medium flex-shrink-0">
                    Current
                  </div>
                )}
              </DropdownMenuItem>
            )
          })}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem asChild>
            <a href="/workspaces" className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50">
              <div className="flex items-center gap-2 flex-1">
                <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900">
                  View All Workspaces
                </span>
              </div>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}