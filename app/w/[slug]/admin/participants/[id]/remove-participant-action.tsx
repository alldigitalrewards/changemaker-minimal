"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface RemoveParticipantActionProps {
  slug: string
  participantId: string
  participantEmail: string
}

export function RemoveParticipantAction({
  slug,
  participantId,
  participantEmail,
}: RemoveParticipantActionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleRemove = async () => {
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
      setOpen(false)
      router.push(`/w/${slug}/admin/participants`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove participant")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Remove Participant
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle>Remove Participant</AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="pt-2">
            Are you sure you want to remove <strong>{participantEmail}</strong> from this workspace?
            <br />
            <br />
            This action will:
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Remove them from the workspace</li>
              <li>• Delete all their challenge enrollments</li>
              <li>• Revoke their access to workspace content</li>
            </ul>
            <br />
            <strong>This action cannot be undone.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Participant
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}