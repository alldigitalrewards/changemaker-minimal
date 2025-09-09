"use client"

import { useState } from "react"
import { Mail, KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface EmailActionsProps {
  slug: string
  participantId: string
  participantEmail: string
}

export function EmailActions({
  slug,
  participantId,
  participantEmail,
}: EmailActionsProps) {
  const [passwordResetLoading, setPasswordResetLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  const handlePasswordReset = async () => {
    setPasswordResetLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${slug}/participants/${participantId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send_password_reset",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to send password reset email")
      }

      toast.success(`Password reset email sent to ${participantEmail}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send password reset email")
    } finally {
      setPasswordResetLoading(false)
    }
  }

  const handleResendInvite = async () => {
    setInviteLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${slug}/participants/${participantId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "resend_invite",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to resend invite email")
      }

      toast.success(`Invite email sent to ${participantEmail}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend invite email")
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handlePasswordReset}
        disabled={passwordResetLoading}
        className="border-blue-200 text-blue-700 hover:bg-blue-50"
      >
        {passwordResetLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <KeyRound className="h-4 w-4 mr-2" />
        )}
        {passwordResetLoading ? "Sending..." : "Send Password Reset"}
      </Button>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleResendInvite}
        disabled={inviteLoading}
        className="border-green-200 text-green-700 hover:bg-green-50"
      >
        {inviteLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Mail className="h-4 w-4 mr-2" />
        )}
        {inviteLoading ? "Sending..." : "Resend Invite"}
      </Button>
    </div>
  )
}