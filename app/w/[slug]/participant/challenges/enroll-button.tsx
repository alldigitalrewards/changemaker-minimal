"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"

interface EnrollButtonProps {
  challengeId: string
  workspaceSlug: string
  isInvited?: boolean
}

export default function EnrollButton({ 
  challengeId, 
  workspaceSlug,
  isInvited = false
}: EnrollButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleEnroll() {
    setLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId })
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error("Error enrolling:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleEnroll} 
      disabled={loading}
      size="sm"
      className={isInvited ? "bg-gray-900 hover:bg-gray-800" : "bg-blue-500 hover:bg-blue-600"}
    >
      <UserPlus className="h-4 w-4 mr-1" />
      {loading ? "Joining..." : isInvited ? "Accept" : "Join"}
    </Button>
  )
}