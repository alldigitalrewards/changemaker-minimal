import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceAccess, withErrorHandling } from '@/lib/auth/api-auth'
import { getOrCreatePointsBalance, getUserBySupabaseId, getUserEnrollments } from '@/lib/db/queries'

export const GET = withErrorHandling(async (
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params
  const { workspace, user } = await requireWorkspaceAccess(slug)

  const dbUser = user.dbUser
  const [balance, enrollments] = await Promise.all([
    getOrCreatePointsBalance(dbUser.id, workspace.id),
    getUserEnrollments(dbUser.id, workspace.id)
  ])

  const supabaseUser = user.supabaseUser
  const fullName = (supabaseUser.user_metadata as any)?.full_name || ''

  return NextResponse.json({
    email: supabaseUser.email,
    fullName,
    workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    points: balance,
    enrollments: enrollments.map(e => ({ id: e.id, status: e.status, challenge: e.Challenge }))
  })
})

export const PUT = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params
  const { workspace, user } = await requireWorkspaceAccess(slug)
  const { fullName } = await request.json()

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return NextResponse.json({ error: 'Invalid full name' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
  if (error) {
    return NextResponse.json({ error: 'Failed to update profile name' }, { status: 500 })
  }

  // Touch User.updatedAt
  const dbUser = await getUserBySupabaseId(user.supabaseUser.id)
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  // Prisma updatedAt column auto-updates on update, write a no-op field
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  try { await (await import('@/lib/prisma')).prisma.user.update({ where: { id: dbUser.id }, data: { email: dbUser.email } }) } catch {}

  return NextResponse.json({ success: true })
})


