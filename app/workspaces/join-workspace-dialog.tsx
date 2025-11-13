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
  scrollToDiscover?: boolean
}

export default function JoinWorkspaceDialog({
  userId,
  workspaceId,
  workspaceName,
  className,
  scrollToDiscover = false
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

  function handleScrollToDiscover() {
    const discoverSection = document.getElementById('discover-workspaces')
    if (discoverSection) {
      discoverSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Add a highlight effect
      discoverSection.classList.add('ring-2', 'ring-gray-900', 'ring-offset-4')
      setTimeout(() => {
        discoverSection.classList.remove('ring-2', 'ring-gray-900', 'ring-offset-4')
      }, 2000)
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

  // If scrollToDiscover is true, render a button that scrolls instead of opening dialog
  if (scrollToDiscover) {
    return (
      <Button
        onClick={handleScrollToDiscover}
        variant="default"
        className={cn(
          "bg-gray-900 hover:bg-gray-800 text-white font-medium focus:ring-2 focus:ring-gray-900 focus:ring-offset-2",
          className
        )}
        aria-label="Browse available workspaces"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Join Workspace
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={workspaceName ? "outline" : "default"}
          className={cn(
            "min-h-[40px] focus:ring-2 focus:ring-gray-900 focus:ring-offset-2",
            workspaceName
              ? "w-full hover:bg-gray-50 hover:border-gray-300"
              : "bg-gray-900 hover:bg-gray-800 text-white font-medium",
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
            <UserPlus className="h-5 w-5 text-gray-900" />
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
            className="bg-gray-900 hover:bg-gray-800"
          >
            {loading ? "Joining..." : "Join Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}