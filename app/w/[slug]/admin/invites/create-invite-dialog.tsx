"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Copy } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import type { Role } from "@/lib/types"

interface CreateInviteDialogProps {
  slug: string
}

export function CreateInviteDialog({ slug }: CreateInviteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role>("PARTICIPANT")
  const [expiresIn, setExpiresIn] = useState("168") // 1 week default
  const [maxUses, setMaxUses] = useState("1")
  const [loading, setLoading] = useState(false)
  const [createdInvite, setCreatedInvite] = useState<{ code: string } | null>(null)

  const handleCreateInvite = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${slug}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          role, 
          expiresIn: parseInt(expiresIn),
          maxUses: parseInt(maxUses)
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create invite code")
      }

      const { inviteCode } = await response.json()
      setCreatedInvite({ code: inviteCode.code })
      toast.success("Invite code created successfully")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invite code")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (createdInvite) {
      const inviteUrl = `${window.location.origin}/invite/${createdInvite.code}`
      navigator.clipboard.writeText(inviteUrl)
      toast.success("Invite link copied to clipboard")
    }
  }

  const handleClose = () => {
    setOpen(false)
    setCreatedInvite(null)
    setRole("PARTICIPANT")
    setExpiresIn("168")
    setMaxUses("1")
  }

  if (createdInvite) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogTrigger asChild>
          <CoralButton variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Create Invite
          </CoralButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Code Created!</DialogTitle>
            <DialogDescription>
              Your invite code has been created. Share this link with others to invite them to the workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Invite Code</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={createdInvite.code}
                  readOnly
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Invite Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/invite/${createdInvite.code}`}
                  readOnly
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <CoralButton onClick={handleClose} variant="default">
              Done
            </CoralButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CoralButton variant="default">
          <Plus className="h-4 w-4 mr-2" />
          Create Invite
        </CoralButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invite Code</DialogTitle>
          <DialogDescription>
            Create an invite code to allow others to join this workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="role">Default Role</Label>
            <Select value={role} onValueChange={(value: Role) => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select default role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTICIPANT">Participant</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expires">Expires In (hours)</Label>
            <Input
              id="expires"
              type="number"
              min="1"
              max="8760"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              placeholder="168"
            />
            <p className="text-sm text-gray-500">
              Default: 168 hours (1 week)
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maxUses">Maximum Uses</Label>
            <Input
              id="maxUses"
              type="number"
              min="1"
              max="1000"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="1"
            />
            <p className="text-sm text-gray-500">
              How many people can use this invite code
            </p>
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
            onClick={handleCreateInvite}
            disabled={loading}
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Invite"
            )}
          </CoralButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}