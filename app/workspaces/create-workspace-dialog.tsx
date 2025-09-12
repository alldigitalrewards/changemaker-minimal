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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createWorkspace } from "./actions"
import { Plus, Building } from "lucide-react"

export default function CreateWorkspaceDialog({ 
  userId, 
  currentWorkspace 
}: { 
  userId: string
  currentWorkspace?: { name: string; slug: string } | null
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(formData: FormData) {
    setLoading(true)
    try {
      const result = await createWorkspace(formData, userId)
      if (result.success) {
        setOpen(false)
        router.refresh()
        router.push(`/w/${result.slug}/admin/dashboard`)
      }
    } catch (error) {
      console.error("Error creating workspace:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          className="bg-coral-500 hover:bg-coral-600 focus:ring-2 focus:ring-coral-500 focus:ring-offset-2"
          aria-label="Create a new workspace"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-coral-500" />
            Create New Workspace
          </DialogTitle>
          <DialogDescription>
            Create a new workspace to manage challenges and participants
            {currentWorkspace && (
              <span className="block mt-2 text-orange-600 font-medium">
                Note: You will be moved from "{currentWorkspace.name}" to the new workspace.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Innovation Hub"
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="my-hub"
                pattern="[a-z0-9-]+"
                title="Only lowercase letters, numbers, and hyphens"
                required
                disabled={loading}
              />
              <p className="text-sm text-gray-500">
                This will be your workspace URL: /w/your-slug
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-coral-500 hover:bg-coral-600"
            >
              <Building className="h-4 w-4 mr-2" />
              {loading ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}