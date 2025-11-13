'use client'

/**
 * Role View Switcher Component
 *
 * Allows users with multiple roles to toggle between role-specific dashboards
 * within the same workspace. For example, an ADMIN can switch to participant
 * view to see the platform as a participant would.
 *
 * Example:
 * - Kim (ADMIN) can toggle between "Admin View" and "Participant View"
 * - When in Participant View, Kim sees only participant features
 * - When in Admin View, Kim sees all admin features
 */

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronDown, Shield, Users, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Role } from '@prisma/client'

interface RoleViewSwitcherProps {
  workspaceSlug: string
  workspaceRole: Role  // User's actual role in this workspace
  className?: string
}

type RoleView = 'admin' | 'manager' | 'participant'

interface RoleViewOption {
  value: RoleView
  label: string
  icon: React.ReactNode
  description: string
  path: string
}

export default function RoleViewSwitcher({
  workspaceSlug,
  workspaceRole,
  className
}: RoleViewSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Determine current role view from URL
  const getCurrentRoleView = (): RoleView => {
    if (pathname.includes('/admin')) return 'admin'
    if (pathname.includes('/manager')) return 'manager'
    return 'participant'
  }

  const currentView = getCurrentRoleView()

  // Determine available views based on user's workspace role
  const getAvailableViews = (): RoleViewOption[] => {
    const views: RoleViewOption[] = []

    // Everyone can view as participant (to see what participants see)
    views.push({
      value: 'participant',
      label: 'Participant View',
      icon: <Users className="h-4 w-4" />,
      description: 'View as a challenge participant',
      path: `/w/${workspaceSlug}/participant/dashboard`
    })

    // Managers and admins can view as manager
    if (workspaceRole === 'MANAGER' || workspaceRole === 'ADMIN') {
      views.push({
        value: 'manager',
        label: 'Manager View',
        icon: <Briefcase className="h-4 w-4" />,
        description: 'View as a challenge manager',
        path: `/w/${workspaceSlug}/manager/dashboard`
      })
    }

    // Only admins can view admin dashboard
    if (workspaceRole === 'ADMIN') {
      views.push({
        value: 'admin',
        label: 'Admin View',
        icon: <Shield className="h-4 w-4" />,
        description: 'Full workspace administration',
        path: `/w/${workspaceSlug}/admin/dashboard`
      })
    }

    return views
  }

  const availableViews = getAvailableViews()
  const currentViewOption = availableViews.find(v => v.value === currentView)

  // Don't show switcher if user only has one view option
  if (availableViews.length <= 1) {
    return null
  }

  const handleSwitchView = (path: string) => {
    router.push(path)
  }

  const getViewColor = (view: RoleView): string => {
    switch (view) {
      case 'admin':
        return 'bg-gray-900 hover:bg-gray-800'
      case 'manager':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'participant':
        return 'bg-green-500 hover:bg-green-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 min-w-0"
          >
            {currentViewOption?.icon}
            <span className="truncate">
              {currentViewOption?.label || 'Select View'}
            </span>
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
            Switch Role View
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {availableViews.map((view) => {
            const isCurrentView = view.value === currentView

            return (
              <DropdownMenuItem
                key={view.value}
                onClick={() => handleSwitchView(view.path)}
                disabled={isCurrentView}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                  isCurrentView ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className={`p-1 rounded ${isCurrentView ? 'bg-gray-200' : 'bg-gray-100'}`}>
                    {view.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isCurrentView ? 'text-gray-900' : 'text-gray-900'
                      }`}>
                        {view.label}
                      </span>
                      {isCurrentView && (
                        <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-800">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {view.description}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}

          <DropdownMenuSeparator />

          <div className="p-3 text-xs text-gray-500">
            <p className="font-medium mb-1">Your workspace role: {workspaceRole}</p>
            <p>Switching views changes your dashboard and available features, but doesn't change your actual permissions.</p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
