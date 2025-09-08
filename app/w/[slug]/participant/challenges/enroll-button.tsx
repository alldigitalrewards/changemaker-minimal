"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface EnrollButtonProps {
  challengeId: string
  challengeTitle: string
  userId: string
  workspaceSlug: string
  isEnrolled: boolean
}

export default function EnrollButton({ 
  challengeId, 
  challengeTitle, 
  userId,
  workspaceSlug,
  isEnrolled 
}: EnrollButtonProps) {
  const [loading, setLoading] = useState(false)
  const [enrolled, setEnrolled] = useState(isEnrolled)
  const router = useRouter()

  async function handleEnroll() {
    setLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          challengeId,
          userId 
        })
      })

      if (response.ok) {
        setEnrolled(true)
        router.refresh()
      }
    } catch (error) {
      console.error("Error enrolling:", error)
    } finally {
      setLoading(false)
    }
  }

  if (enrolled) {
    return (
      <Button variant="outline" disabled className="w-full border-coral-300 text-coral-700">
        ✓ Enrolled
      </Button>
    )
  }

  return (
    <Button 
      onClick={handleEnroll} 
      disabled={loading}
      className="w-full bg-gradient-to-r from-coral-500 to-terracotta-600 hover:from-coral-600 hover:to-terracotta-700 text-white"
    >
      {loading ? "Enrolling..." : "Join Challenge"}
    </Button>
  )
}