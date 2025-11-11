"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, UserCheck, Loader2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Role } from "@/lib/types"

interface ParticipantRoleToggleProps {
  slug: string
  participantId: string
  currentRole: Role
  participantEmail: string
}

export function ParticipantRoleToggle({
  slug,
  participantId,
  currentRole,
  participantEmail,
}: ParticipantRoleToggleProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const newRole = currentRole === "ADMIN" ? "PARTICIPANT" : "ADMIN"

  const handleRoleChange = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${slug}/participants/${participantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update participant role")
      }

      toast.success(`Participant role changed to ${newRole}`)
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role")
    } finally {
      setLoading(false)
    }
  }

  const getRoleConfig = (role: Role) => {
    if (role === "ADMIN") {
      return {
        icon: Shield,
        label: "Admin",
        className: "bg-blue-100 text-blue-800 border-blue-200"
      }
    }
    return {
      icon: UserCheck,
      label: "Participant", 
      className: "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const currentConfig = getRoleConfig(currentRole)
  const newConfig = getRoleConfig(newRole)
  const CurrentIcon = currentConfig.icon
  const NewIcon = newConfig.icon

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CurrentIcon className="h-4 w-4 mr-2" />
          Change Role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Participant Role</DialogTitle>
          <DialogDescription>
            Update the role for {participantEmail} in this workspace.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Current Role</h3>
                <p className="text-sm text-gray-500">Active role in workspace</p>
              </div>
              <Badge variant="outline" className={currentConfig.className}>
                <CurrentIcon className="h-3 w-3 mr-1" />
                {currentConfig.label}
              </Badge>
            </div>

            <div className="flex items-center justify-center">
              <div className="text-gray-400">↓</div>
            </div>

            <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
              <div>
                <h3 className="font-medium">New Role</h3>
                <p className="text-sm text-gray-500">
                  {newRole === "ADMIN" 
                    ? "Full access to workspace management" 
                    : "Can participate in challenges"
                  }
                </p>
              </div>
              <Badge variant="outline" className={newConfig.className}>
                <NewIcon className="h-3 w-3 mr-1" />
                {newConfig.label}
              </Badge>
            </div>
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
            onClick={handleRoleChange}
            disabled={loading}
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              `Change to ${newConfig.label}`
            )}
          </CoralButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}