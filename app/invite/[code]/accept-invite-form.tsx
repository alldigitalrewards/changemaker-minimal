"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CoralButton } from "@/components/ui/coral-button"
import { Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface AcceptInviteFormProps {
  code: string
  role?: 'ADMIN' | 'PARTICIPANT'
}

export function AcceptInviteForm({ code, role: inviteRole }: AcceptInviteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const supabase = createClient()
  const search = useSearchParams()

  const handleAcceptInvite = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      // If not authenticated or user not yet synced in DB, send through signup
      if (response.status === 401 || response.status === 404) {
        toast.message("Create an account to join this workspace")
        const roleQS = inviteRole ? `&role=${inviteRole}` : ''
        router.push(`/auth/signup?redirectTo=${encodeURIComponent(`/invite/${code}`)}${roleQS}`)
        return
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to accept invite")
      }

      const result = await response.json()
      setAccepted(true)
      toast.success(result.message)
      
      // Decide redirect target
      const slug = result?.workspace?.slug
      const role = (result?.role || 'PARTICIPANT') as 'ADMIN' | 'PARTICIPANT'
      const dashboard = role === 'ADMIN' 
        ? `/w/${slug}/admin/dashboard` 
        : `/w/${slug}/participant/dashboard`

      // Check if the user has completed onboarding
      const { data: { user } } = await supabase.auth.getUser()
      const profileComplete = Boolean(user?.user_metadata?.profileComplete)

      const next = profileComplete ? dashboard : `/onboarding?next=${encodeURIComponent(dashboard)}`

      // Immediate redirect to avoid cases where user remains on invite page
      router.push(next)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept invite")
    } finally {
      setLoading(false)
    }
  }

  if (accepted) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-green-700">Welcome!</h3>
          <p className="text-gray-600">You have successfully joined the workspace.</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting you now...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          Ready to join? Click below to accept this invitation.
        </p>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <CoralButton
          onClick={handleAcceptInvite}
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Accepting...
            </>
          ) : (
            "Accept Invitation"
          )}
        </CoralButton>
      </div>
    </div>
  )
}