import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { getUserBySupabaseId, getWorkspaceLeaderboard } from "@/lib/db/queries"
import { LeaderboardClient } from "./components/leaderboard-client"
import { prisma } from "@/lib/prisma"

function LeaderboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-gray-200 rounded-lg h-32" />
      <div className="bg-gray-200 rounded-lg h-48" />
      <div className="bg-gray-200 rounded-lg h-64" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-20" />
        ))}
      </div>
      <div className="bg-gray-200 rounded-lg h-32" />
    </div>
  )
}

export default async function ParticipantLeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== "PARTICIPANT") redirect("/workspaces")

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) redirect("/workspaces")

  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) redirect("/auth/login")

  // Fetch leaderboard data
  const leaderboard = await getWorkspaceLeaderboard(workspace.id, 50)

  // Fetch challenges for filtering
  const challenges = await prisma.challenge.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardClient
        initialLeaderboard={leaderboard}
        currentUserId={dbUser.id}
        workspaceName={workspace.name}
        challenges={challenges}
        isAdmin={false}
      />
    </Suspense>
  )
}