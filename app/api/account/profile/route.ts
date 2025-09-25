import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, withErrorHandling } from '@/lib/auth/api-auth'
import { getUserBySupabaseId } from '@/lib/db/queries'

export const GET = withErrorHandling(async () => {
  const { supabaseUser } = await requireAuth()
  const fullName = (supabaseUser.user_metadata as any)?.full_name || ''
  return NextResponse.json({
    email: supabaseUser.email,
    fullName,
    userMetadata: supabaseUser.user_metadata || {}
  })
})

export const PUT = withErrorHandling(async (request: Request) => {
  const { supabaseUser, dbUser } = await requireAuth()
  const body = await request.json().catch(() => ({})) as { fullName?: string; department?: string; bio?: string; timezone?: string }

  const updates: Record<string, any> = {}
  if (typeof body.fullName === 'string') updates.full_name = body.fullName.trim()
  if (typeof body.department === 'string') updates.department = body.department.trim()
  if (typeof body.bio === 'string') updates.bio = body.bio.trim()
  if (typeof body.timezone === 'string') updates.timezone = body.timezone.trim()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ data: updates })
  if (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  // Touch prisma User.updatedAt via no-op update
  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.user.update({ where: { id: dbUser.id }, data: { email: dbUser.email } })
  } catch {}

  return NextResponse.json({ success: true })
})


