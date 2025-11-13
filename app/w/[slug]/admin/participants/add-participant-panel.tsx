"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CoralButton } from "@/components/ui/coral-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Loader2, Mail, User, Building2, Briefcase, Phone } from "lucide-react"
import { Role } from "@/lib/types"

interface AddParticipantPanelProps {
  slug: string
  onClose: () => void
}

export function AddParticipantPanel({ slug, onClose }: AddParticipantPanelProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [department, setDepartment] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role>("PARTICIPANT")
  const [sendInvite, setSendInvite] = useState(true)
  const [customMessage, setCustomMessage] = useState("")
  const [showCustomMessage, setShowCustomMessage] = useState(false)
  const [loading, setLoading] = useState(false)

  const isFormValid = email && firstName && lastName

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${slug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          phone: phone || undefined,
          company: company || undefined,
          jobTitle: jobTitle || undefined,
          department: department || undefined,
          role: selectedRole,
          sendInvite,
          customMessage: showCustomMessage ? customMessage : undefined
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to add participant")
      }

      toast.success("Participant added successfully")
      // Reset form
      setEmail("")
      setFirstName("")
      setLastName("")
      setPhone("")
      setCompany("")
      setJobTitle("")
      setDepartment("")
      setSelectedRole("PARTICIPANT")
      setCustomMessage("")
      setShowCustomMessage(false)
      router.refresh()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add participant")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Form Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              First Name *
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            Email Address *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="participant@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            Phone (optional)
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            Company (optional)
          </Label>
          <Input
            id="company"
            type="text"
            placeholder="Acme Inc."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="jobTitle" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-gray-500" />
              Job Title (optional)
            </Label>
            <Input
              id="jobTitle"
              type="text"
              placeholder="Product Manager"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department (optional)</Label>
            <Input
              id="department"
              type="text"
              placeholder="Engineering"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
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

        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendInvite"
              checked={sendInvite}
              onCheckedChange={(checked) => setSendInvite(checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="sendInvite" className="text-sm font-normal cursor-pointer">
              Send invitation email
            </Label>
          </div>

          {sendInvite && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="customMessage"
                  checked={showCustomMessage}
                  onCheckedChange={(checked) => setShowCustomMessage(checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="customMessage" className="text-sm font-normal cursor-pointer">
                  Add custom welcome message
                </Label>
              </div>

              {showCustomMessage && (
                <div className="space-y-2">
                  <Label htmlFor="message">Custom Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Welcome to our workspace! We're excited to have you join us..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    disabled={loading}
                    rows={3}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <CoralButton
            onClick={handleSubmit}
            disabled={loading || !isFormValid}
            variant="default"
            className="flex-1"
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
        </div>
      </div>

      {/* Right Column: Preview */}
      <div>
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-900" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">
                    {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Full Name"}
                  </p>
                  <p className="text-sm text-gray-600">{email || "email@example.com"}</p>
                </div>
              </div>

              <div className="grid gap-2 pt-2 border-t">
                {selectedRole && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium">{selectedRole}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{phone}</span>
                  </div>
                )}
                {company && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Company:</span>
                    <span className="font-medium">{company}</span>
                  </div>
                )}
                {jobTitle && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Job Title:</span>
                    <span className="font-medium">{jobTitle}</span>
                  </div>
                )}
                {department && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium">{department}</span>
                  </div>
                )}
              </div>

              {sendInvite && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Mail className="h-4 w-4" />
                    <span>Invitation email will be sent</span>
                  </div>
                  {showCustomMessage && customMessage && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-xs text-gray-500 mb-1">Custom message:</p>
                      <p className="text-sm">{customMessage}</p>
                    </div>
                  )}
                </div>
              )}

              {!isFormValid && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-amber-600">
                    Fill in required fields to add participant
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
