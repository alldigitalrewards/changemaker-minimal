'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Trash2, Loader2, Users, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Manager {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  assignedAt: string
}

interface WorkspaceManager {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
}

interface ChallengeManagersDialogProps {
  challengeId: string
  workspaceSlug: string
}

function getDisplayName(user: { email: string; firstName?: string | null; lastName?: string | null; displayName?: string | null }): string {
  if (user.displayName) return user.displayName
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  return user.email
}

export function ChallengeManagersDialog({ challengeId, workspaceSlug }: ChallengeManagersDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [assignments, setAssignments] = useState<Manager[]>([])
  const [availableManagers, setAvailableManagers] = useState<WorkspaceManager[]>([])
  const [selectedManagerId, setSelectedManagerId] = useState<string>('')
  const [managerToRemove, setManagerToRemove] = useState<Manager | null>(null)

  // Fetch assignments and available managers when dialog opens
  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch current assignments
      const assignmentsRes = await fetch(
        `/api/workspaces/${workspaceSlug}/challenges/${challengeId}/managers`
      )
      if (!assignmentsRes.ok) throw new Error('Failed to fetch assignments')
      const assignmentsData = await assignmentsRes.json()
      setAssignments(assignmentsData.managers || [])

      // Fetch all workspace managers
      const managersRes = await fetch(`/api/workspaces/${workspaceSlug}/participants`)
      if (!managersRes.ok) throw new Error('Failed to fetch managers')
      const managersData = await managersRes.json()

      // Filter to MANAGER role and exclude already assigned
      const assignedIds = new Set((assignmentsData.managers || []).map((m: Manager) => m.id))
      const allManagers = managersData.participants || []
      const filtered = allManagers.filter(
        (p: any) => p.role === 'MANAGER' && !assignedIds.has(p.id)
      )
      setAvailableManagers(filtered)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load manager data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddManager = async () => {
    if (!selectedManagerId) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/challenges/${challengeId}/managers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            managerId: selectedManagerId,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign manager')
      }

      toast({
        title: 'Manager assigned',
        description: 'The manager has been successfully assigned to this challenge.',
      })

      setSelectedManagerId('')
      await fetchData() // Refresh lists
      router.refresh()
    } catch (error) {
      console.error('Error assigning manager:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign manager',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveManager = async () => {
    if (!managerToRemove) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/challenges/${challengeId}/managers/${managerToRemove.id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove manager')
      }

      toast({
        title: 'Manager removed',
        description: 'The manager has been removed from this challenge.',
      })

      setManagerToRemove(null)
      await fetchData() // Refresh lists
      router.refresh()
    } catch (error) {
      console.error('Error removing manager:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove manager',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Manage Managers
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Challenge Managers</DialogTitle>
            <DialogDescription>
              Assign managers who can review submissions for this challenge
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Assignments */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Current Assignments</h3>
              {loading && assignments.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center border rounded-md bg-muted/20">
                  No managers assigned yet
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.map((manager) => (
                    <div
                      key={manager.id}
                      className="flex items-center justify-between p-3 border rounded-md bg-muted/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{getDisplayName(manager)}</p>
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                            <Users className="h-3 w-3 mr-1" />
                            MANAGER
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{manager.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Assigned{' '}
                          {new Date(manager.assignedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManagerToRemove(manager)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Manager */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Add Manager</h3>
              <div className="flex gap-2">
                <Select value={selectedManagerId} onValueChange={setSelectedManagerId} disabled={loading}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a manager..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableManagers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No available managers</div>
                    ) : (
                      availableManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          <div className="flex flex-col">
                            <span>{getDisplayName(manager)}</span>
                            <span className="text-xs text-muted-foreground">{manager.email}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddManager}
                  disabled={!selectedManagerId || loading}
                  className="shrink-0"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!managerToRemove} onOpenChange={() => setManagerToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Manager?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{managerToRemove ? getDisplayName(managerToRemove) : ''}</strong> from this
              challenge? They will no longer be able to review submissions.
              {assignments.length === 1 && (
                <span className="block mt-2 text-amber-600">
                  Warning: This is the last assigned manager for this challenge.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveManager}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
