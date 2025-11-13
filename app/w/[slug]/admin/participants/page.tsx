import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ParticipantsClient } from "./participants-client"

export default async function AdminParticipantsPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ slug: string }>,
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const sp = (await (searchParams || Promise.resolve({} as any))) as any
  const pointsFilter = typeof sp.points === 'string' ? sp.points : ''
  const sort = typeof sp.sort === 'string' ? sp.sort : ''
  const dir = sp.dir === 'desc' ? 'desc' : 'asc'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== "ADMIN") {
    redirect("/workspaces")
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect("/workspaces")
  }

  // Get participants via membership system to include invited/existing users
  const memberships = await prisma.workspaceMembership.findMany({
    where: {
      workspaceId: workspace.id
    },
    include: {
      User: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          isPending: true,
          Enrollment: {
            where: {
              Challenge: {
                workspaceId: workspace.id
              }
            },
            include: {
              Challenge: {
                select: {
                  title: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: [
      { role: 'asc' },
      { joinedAt: 'asc' }
    ]
  })

  const participants = memberships.map(m => ({
    id: m.User.id,
    email: m.User.email,
    firstName: m.User.firstName,
    lastName: m.User.lastName,
    displayName: m.User.displayName,
    role: m.role,
    enrollments: m.User.Enrollment,
    createdAt: m.joinedAt,
    isPending: m.User.isPending
  }))

  // Fetch points balances for all listed participants in this workspace
  const balances = await prisma.pointsBalance.findMany({
    where: { workspaceId: workspace.id, userId: { in: participants.map(p => p.id) } },
    select: { userId: true, totalPoints: true, availablePoints: true }
  })
  const balanceByUserId = Object.fromEntries(balances.map(b => [b.userId, b])) as Record<string, { userId: string; totalPoints: number; availablePoints: number }>

  let rows = participants.map(p => {
    const b = balanceByUserId[p.id]
    return {
      ...p,
      totalPoints: b?.totalPoints ?? 0,
      availablePoints: b?.availablePoints ?? 0,
    }
  })

  // Filter by points
  if (pointsFilter === 'has') {
    rows = rows.filter(r => (r.totalPoints || r.availablePoints) > 0)
  } else if (pointsFilter === 'none') {
    rows = rows.filter(r => (r.totalPoints || r.availablePoints) === 0)
  }

  // Sort by points
  if (sort === 'points-avail') {
    rows = rows.sort((a, b) => dir === 'desc' ? b.availablePoints - a.availablePoints : a.availablePoints - b.availablePoints)
  } else if (sort === 'points-total') {
    rows = rows.sort((a, b) => dir === 'desc' ? b.totalPoints - a.totalPoints : a.totalPoints - b.totalPoints)
  }

  // Get enrollment statistics
  const enrollmentStats = await prisma.enrollment.groupBy({
    by: ["status"],
    where: {
      Challenge: {
        workspaceId: workspace.id
      }
    },
    _count: true
  })

  const totalEnrollments = enrollmentStats.reduce((sum, stat) => sum + stat._count, 0)
  const activeEnrollments = enrollmentStats.find(s => s.status === "ENROLLED")?._count || 0
  const completedEnrollments = enrollmentStats.find(s => s.status === "WITHDRAWN")?._count || 0

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Participants</h1>
        <p className="text-gray-600">Manage participants in {workspace.name}</p>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{participants.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalEnrollments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{activeEnrollments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{completedEnrollments}</p>
            </CardContent>
          </Card>
        </div>

        {/* Participants Table with Inline Panels */}
        <ParticipantsClient
          slug={slug}
          participants={rows}
          pointsFilter={pointsFilter}
          sort={sort}
          dir={dir}
        />
      </div>
    </div>
  )
}