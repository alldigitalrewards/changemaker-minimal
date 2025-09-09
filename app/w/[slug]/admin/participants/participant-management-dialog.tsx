"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trash2, UserPlus, Loader2, Edit } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CoralButton } from "@/components/ui/coral-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Role } from "@/lib/types"

interface ParticipantManagementDialogProps {
  slug: string
  mode: "add" | "remove" | "edit"
  participantId?: string
  participantEmail?: string
  participantRole?: Role
  showLabel?: boolean // Add option to show label for edit button
}

export function ParticipantManagementDialog({
  slug,
  mode,
  participantId,
  participantEmail,
  participantRole,
  showLabel = false,
}: ParticipantManagementDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role>(participantRole || "PARTICIPANT")
  const [loading, setLoading] = useState(false)
  const [showRemoveAlert, setShowRemoveAlert] = useState(false)

  // Reset selected role when dialog opens
  useEffect(() => {
    if (open && participantRole) {
      setSelectedRole(participantRole)
    }
  }, [open, participantRole])

  const handleAddParticipant = async () => {
    if (!email) {
      toast.error("Please enter an email address")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${slug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "PARTICIPANT" }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to add participant")
      }

      toast.success("Participant added successfully")
      setEmail("")
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add participant")
    } finally {
      setLoading(false)
    }
  }

  const handleEditParticipant = async () => {
    if (!participantId || !selectedRole) return

    // Don't make API call if role hasn't changed
    if (selectedRole === participantRole) {
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${slug}/participants/${participantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update participant role")
      }

      toast.success(`Participant role updated to ${selectedRole}`)
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update participant role")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveParticipant = async () => {
    if (!participantId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${slug}/participants/${participantId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to remove participant")
      }

      toast.success("Participant removed successfully")
      setShowRemoveAlert(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove participant")
    } finally {
      setLoading(false)
    }
  }

  if (mode === "add") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <CoralButton variant="default">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Participant
          </CoralButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Participant</DialogTitle>
            <DialogDescription>
              Enter the email address of the person you want to add as a participant to this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="participant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <CoralButton
              onClick={handleAddParticipant}
              disabled={loading || !email}
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Participant"
              )}
            </CoralButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (mode === "edit") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {showLabel ? (
            <CoralButton variant="default">
              <Edit className="h-4 w-4 mr-2" />
              Edit Participant
            </CoralButton>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={(e) => e.stopPropagation()}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Participant Role</DialogTitle>
            <DialogDescription>
              Change the role for {participantEmail} in this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value: Role) => setSelectedRole(value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARTICIPANT">Participant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <CoralButton
              onClick={handleEditParticipant}
              disabled={loading || selectedRole === participantRole}
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </CoralButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation()
          setShowRemoveAlert(true)
        }}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={showRemoveAlert} onOpenChange={setShowRemoveAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Participant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {participantEmail} from this workspace? 
              This will also remove all their challenge enrollments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveParticipant}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}