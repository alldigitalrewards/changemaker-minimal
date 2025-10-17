import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getWorkspaceBySlug, getUserBySupabaseId, verifyWorkspaceAdmin } from '@/lib/db/queries'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const dbUser = await getUserBySupabaseId(user.id)
  const isAdmin = dbUser && dbUser.workspaceId === workspace.id && await verifyWorkspaceAdmin(dbUser.id, workspace.id)
  if (!isAdmin) return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })

  const memberships = await prisma.workspaceMembership.findMany({
    where: { workspaceId: workspace.id },
    include: { User: true },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }]
  })

  const userIds = memberships.map(m => m.userId)
  const balances = await prisma.pointsBalance.findMany({
    where: { workspaceId: workspace.id, userId: { in: userIds } },
    select: { userId: true, totalPoints: true, availablePoints: true }
  })
  const byId = Object.fromEntries(balances.map(b => [b.userId, b])) as Record<string, { userId: string; totalPoints: number; availablePoints: number }>

  const rows = memberships.map(m => {
    const b = byId[m.userId]
    return {
      email: m.User.email,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      totalPoints: b?.totalPoints ?? 0,
      availablePoints: b?.availablePoints ?? 0,
    }
  })

  const header = ['email','role','joinedAt','availablePoints','totalPoints']
  const lines = [header.join(','), ...rows.map(r => [r.email, r.role, r.joinedAt, String(r.availablePoints), String(r.totalPoints)].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))]
  const csv = lines.join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="participants-${slug}.csv"`
    }
  })
}


