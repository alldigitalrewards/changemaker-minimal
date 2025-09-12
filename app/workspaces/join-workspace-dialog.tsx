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
import { Plus, UserPlus } from "lucide-react"

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
      <Button variant="outline" disabled className={cn("w-full", className)}>
        <UserPlus className="h-4 w-4 mr-2" />
        Login to Join
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={workspaceName ? "outline" : "default"}
          className={cn(
            "w-full min-h-[40px] focus:ring-2 focus:ring-coral-500 focus:ring-offset-2", 
            workspaceName 
              ? "hover:bg-coral-50 hover:border-coral-300" 
              : "bg-coral-500 hover:bg-coral-600 text-white",
            className
          )}
          aria-label={workspaceName ? `Join ${workspaceName} workspace` : "Join an existing workspace"}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {workspaceName ? `Join ${workspaceName}` : "Join Workspace"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-coral-500" />
            Join {workspaceName || "Workspace"}
          </DialogTitle>
          <DialogDescription>
            You will join this workspace as a participant. You can browse and enroll in challenges.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleJoin} 
            disabled={loading}
            className="bg-coral-500 hover:bg-coral-600"
          >
            {loading ? "Joining..." : "Join Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}