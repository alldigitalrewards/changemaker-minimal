"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building, Plus, Loader2 } from "lucide-react"
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
import { toast } from "sonner"

export function PlatformAdminWorkspaceDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Workspace fields
  const [workspaceName, setWorkspaceName] = useState("")
  const [workspaceSlug, setWorkspaceSlug] = useState("")

  // Admin user fields
  const [adminEmail, setAdminEmail] = useState("")
  const [adminFirstName, setAdminFirstName] = useState("")
  const [adminLastName, setAdminLastName] = useState("")
  const [adminPhone, setAdminPhone] = useState("")
  const [adminCompany, setAdminCompany] = useState("")
  const [adminJobTitle, setAdminJobTitle] = useState("")
  const [adminDepartment, setAdminDepartment] = useState("")

  const handleCreate = async () => {
    if (!workspaceName || !workspaceSlug) {
      toast.error("Please enter workspace name and slug")
      return
    }

    if (!adminEmail || !adminFirstName || !adminLastName) {
      toast.error("Please enter admin email, first name, and last name")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: {
            name: workspaceName,
            slug: workspaceSlug,
          },
          admin: {
            email: adminEmail,
            firstName: adminFirstName,
            lastName: adminLastName,
            phone: adminPhone || undefined,
            company: adminCompany || undefined,
            jobTitle: adminJobTitle || undefined,
            department: adminDepartment || undefined,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create workspace")
      }

      toast.success("Workspace created successfully")

      // Reset form
      setWorkspaceName("")
      setWorkspaceSlug("")
      setAdminEmail("")
      setAdminFirstName("")
      setAdminLastName("")
      setAdminPhone("")
      setAdminCompany("")
      setAdminJobTitle("")
      setAdminDepartment("")

      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create workspace")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CoralButton variant="default">
          <Plus className="h-4 w-4 mr-2" />
          Create Workspace
        </CoralButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-gray-900" />
            Create New Workspace
          </DialogTitle>
          <DialogDescription>
            Create a new workspace and assign an admin. The admin will receive an invitation email.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Workspace Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Workspace Details</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  placeholder="Innovation Hub"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="workspace-slug">URL Slug</Label>
                <Input
                  id="workspace-slug"
                  placeholder="innovation-hub"
                  pattern="[a-z0-9-]+"
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>
            </div>
          </div>

          {/* Admin Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Workspace Admin</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="admin-email">Email Address *</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@company.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="admin-firstName">First Name *</Label>
                  <Input
                    id="admin-firstName"
                    placeholder="John"
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="admin-lastName">Last Name *</Label>
                  <Input
                    id="admin-lastName"
                    placeholder="Doe"
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-phone">Phone (optional)</Label>
                <Input
                  id="admin-phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-company">Company (optional)</Label>
                <Input
                  id="admin-company"
                  placeholder="Acme Inc."
                  value={adminCompany}
                  onChange={(e) => setAdminCompany(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="admin-jobTitle">Job Title (optional)</Label>
                  <Input
                    id="admin-jobTitle"
                    placeholder="Innovation Director"
                    value={adminJobTitle}
                    onChange={(e) => setAdminJobTitle(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="admin-department">Department (optional)</Label>
                  <Input
                    id="admin-department"
                    placeholder="R&D"
                    value={adminDepartment}
                    onChange={(e) => setAdminDepartment(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
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
            onClick={handleCreate}
            disabled={loading || !workspaceName || !workspaceSlug || !adminEmail || !adminFirstName || !adminLastName}
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Building className="h-4 w-4 mr-2" />
                Create Workspace
              </>
            )}
          </CoralButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
