"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CoralButton } from "@/components/ui/coral-button"
import { Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface AcceptInviteFormProps {
  code: string
}

export function AcceptInviteForm({ code }: AcceptInviteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const handleAcceptInvite = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to accept invite")
      }

      const result = await response.json()
      setAccepted(true)
      toast.success(result.message)
      
      // Redirect to workspace after a brief delay
      setTimeout(() => {
        router.push(`/w/${result.workspace.slug}`)
      }, 2000)
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