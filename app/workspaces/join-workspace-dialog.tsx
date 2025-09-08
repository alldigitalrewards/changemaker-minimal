"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { joinWorkspace } from "./actions"
import { cn } from "@/lib/utils"

interface JoinWorkspaceDialogProps {
  userId?: string
  workspaceId?: string
  workspaceName?: string
  className?: string
}

export default function JoinWorkspaceDialog({ 
  userId, 
  workspaceId, 
  workspaceName,
  className 
}: JoinWorkspaceDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleJoin() {
    if (!userId || !workspaceId) return
    
    setLoading(true)
    try {
      const result = await joinWorkspace(userId, workspaceId)
      if (result.success) {
        setOpen(false)
        router.refresh()
        router.push(`/w/${result.slug}/participant/dashboard`)
      }
    } catch (error) {
      console.error("Error joining workspace:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return (
      <Button variant="outline" disabled className={className}>
        Login to Join
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("w-full", className)}>
          {workspaceName ? `Join ${workspaceName}` : "Join Workspace"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join {workspaceName || "Workspace"}</DialogTitle>
          <DialogDescription>
            You will join this workspace as a participant. You can browse and enroll in challenges.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={loading}>
            {loading ? "Joining..." : "Join Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}