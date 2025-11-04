import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ParticipantManagementDialog } from "./participant-management-dialog"
import { BulkInviteDialog } from "./bulk-invite-dialog"
import { Eye, Shield, UserCheck, Users } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getUserDisplayName } from "@/lib/user-utils"

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

  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    if (pointsFilter) p.set('points', pointsFilter)
    if (sort) p.set('sort', sort)
    if (dir) p.set('dir', dir)
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined || v === '') p.delete(k)
      else p.set(k, v)
    })
    const s = p.toString()
    return s ? `?${s}` : ''
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

        {/* Participants Table with Filters & Segments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Participants</CardTitle>
                <CardDescription>View and manage workspace participants</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* Filters (MVP) */}
                <form className="hidden md:flex items-center gap-2" method="GET">
                  <select name="status" className="border rounded px-2 py-1 text-sm">
                    <option value="">All statuses</option>
                    <option value="INVITED">Invited</option>
                    <option value="ENROLLED">Enrolled</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                  </select>
                  <input type="text" name="email" placeholder="Filter by email" className="border rounded px-2 py-1 text-sm" />
                  <select name="points" defaultValue={pointsFilter} className="border rounded px-2 py-1 text-sm">
                    <option value="">All points</option>
                    <option value="has">Has points</option>
                    <option value="none">0 points</option>
                  </select>
                </form>
                {/* Segments (server-rendered simple list) */}
                {/* In a follow-up we can fetch via client and enable create/edit inline */}
                <a href={`/api/workspaces/${slug}/participants/export`} className="border rounded px-2 py-1 text-sm">Export CSV</a>
                <BulkInviteDialog slug={slug} />
                <ParticipantManagementDialog slug={slug} mode="add" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">{/* Bulk select placeholder */}</TableHead>
                    <TableHead>Participant</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>
                      <Link href={qs({ sort: 'points-avail', dir: sort === 'points-avail' && dir === 'asc' ? 'desc' : 'asc' })} className="underline-offset-2 hover:underline">Points</Link>
                    </TableHead>
                    <TableHead>Enrollments</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((participant) => (
                    <TableRow 
                      key={participant.id} 
                      className="hover:bg-gray-50"
                    >
                      <TableCell><input type="checkbox" /></TableCell>
                      <TableCell>
                        <Link href={`/w/${slug}/admin/participants/${participant.id}`} className="block">
                          <div>
                            <p className="font-medium">{getUserDisplayName(participant)}</p>
                            <p className="text-sm text-gray-500">{participant.email}</p>
                            <p className="text-sm text-gray-500">
                          {participant.enrollments.length} enrollment{participant.enrollments.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/w/${slug}/admin/participants/${participant.id}`} className="block">
                          <Badge
                            variant="outline"
                            className={
                              participant.role === "ADMIN"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : participant.role === "MANAGER"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
                            }
                          >
                            {participant.role === "ADMIN" ? (
                              <Shield className="h-3 w-3 mr-1" />
                            ) : participant.role === "MANAGER" ? (
                              <Users className="h-3 w-3 mr-1" />
                            ) : (
                              <UserCheck className="h-3 w-3 mr-1" />
                            )}
                            {participant.role}
                          </Badge>
                          {participant.isPending && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-200">Pending</span>
                          )}
                        </Link>
                      </TableCell>
                      {/* Points balance */}
                      <TableCell>
                        <Link href={`/w/${slug}/admin/participants/${participant.id}`} className="block">
                      <span className="text-sm text-gray-700" title={`Available / Total`}>
                        {participant.availablePoints}/{participant.totalPoints}
                      </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/w/${slug}/admin/participants/${participant.id}`} className="block">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                              {participant.enrollments.length}
                            </Badge>
                            {participant.enrollments.length > 0 && (
                              <div className="flex gap-1">
                                {participant.enrollments.filter(e => e.status === 'ENROLLED').length > 0 && (
                                  <div className="h-2 w-2 rounded-full bg-green-500" title={`${participant.enrollments.filter(e => e.status === 'ENROLLED').length} active`}></div>
                                )}
                                {participant.enrollments.filter(e => e.status === 'INVITED').length > 0 && (
                                  <div className="h-2 w-2 rounded-full bg-yellow-500" title={`${participant.enrollments.filter(e => e.status === 'INVITED').length} invited`}></div>
                                )}
                                {participant.enrollments.filter(e => e.status === 'WITHDRAWN').length > 0 && (
                                  <div className="h-2 w-2 rounded-full bg-blue-500" title={`${participant.enrollments.filter(e => e.status === 'WITHDRAWN').length} completed`}></div>
                                )}
                              </div>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/w/${slug}/admin/participants/${participant.id}`} className="block">
                          <span className="text-sm text-gray-500">
                            {new Date(participant.createdAt).toLocaleDateString()}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/w/${slug}/admin/participants/${participant.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {participant.role === "PARTICIPANT" && (
                            <ParticipantManagementDialog
                              slug={slug}
                              mode="remove"
                              participantId={participant.id}
                              participantEmail={participant.email}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-gray-500">
                No participants in this workspace yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}