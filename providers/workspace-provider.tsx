'use client'

/**
 * Workspace Context Provider
 * 
 * Client-side workspace context management with multi-workspace support.
 * Handles workspace switching, persistence, and loading states.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Workspace, type Role } from '@/lib/types'

interface WorkspaceContextType {
  // Current workspace state
  currentWorkspace: Workspace | null
  currentRole: Role | null
  
  // Available workspaces
  availableWorkspaces: Workspace[]
  
  // Loading states
  isLoading: boolean
  isSwitching: boolean
  
  // Actions
  switchWorkspace: (slug: string) => Promise<void>
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

interface WorkspaceProviderProps {
  children: React.ReactNode
  initialWorkspace?: Workspace | null
  initialRole?: Role | null
  initialWorkspaces?: Workspace[]
}

export function WorkspaceProvider({ 
  children, 
  initialWorkspace = null,
  initialRole = null,
  initialWorkspaces = []
}: WorkspaceProviderProps) {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(initialWorkspace)
  const [currentRole, setCurrentRole] = useState<Role | null>(initialRole)
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>(initialWorkspaces)
  const [isLoading, setIsLoading] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  const supabase = createClient()

  // Load workspaces on mount
  const refreshWorkspaces = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user's workspaces from API
      const response = await fetch('/api/user/workspaces')
      if (response.ok) {
        const data = await response.json()
        setAvailableWorkspaces(data.workspaces || [])
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Switch workspace function
  const switchWorkspace = useCallback(async (slug: string) => {
    if (isSwitching) return
    
    setIsSwitching(true)
    try {
      // Call switch API
      const response = await fetch('/api/workspace/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update local storage for instant access
        localStorage.setItem('lastWorkspaceSlug', slug)
        
        // Redirect to new workspace (try admin first, fallback to participant)
        window.location.href = `/w/${slug}/admin/dashboard`
      } else {
        // Handle specific error cases
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 403) {
          // Access denied - remove from local storage and refresh workspaces
          localStorage.removeItem('lastWorkspaceSlug')
          await refreshWorkspaces()
          console.error('Access denied to workspace:', slug)
        } else if (response.status === 404) {
          // Workspace not found - refresh workspaces
          await refreshWorkspaces()
          console.error('Workspace not found:', slug)
        } else {
          console.error('Failed to switch workspace:', errorData.error || 'Unknown error')
        }
      }
    } catch (error) {
      console.error('Error switching workspace:', error)
    } finally {
      setIsSwitching(false)
    }
  }, [isSwitching, refreshWorkspaces])

  // Sync with localStorage on mount
  useEffect(() => {
    // If no current workspace but we have a localStorage preference, try to use it
    if (!currentWorkspace && availableWorkspaces.length > 0) {
      const lastSlug = localStorage.getItem('lastWorkspaceSlug')
      if (lastSlug) {
        const workspace = availableWorkspaces.find(w => w.slug === lastSlug)
        if (workspace) {
          setCurrentWorkspace(workspace)
        }
      }
    }
  }, [currentWorkspace, availableWorkspaces])

  // Load workspaces on mount
  useEffect(() => {
    if (initialWorkspaces.length === 0) {
      refreshWorkspaces()
    }
  }, [refreshWorkspaces, initialWorkspaces.length])

  const value: WorkspaceContextType = {
    currentWorkspace,
    currentRole,
    availableWorkspaces,
    isLoading,
    isSwitching,
    switchWorkspace,
    refreshWorkspaces,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}