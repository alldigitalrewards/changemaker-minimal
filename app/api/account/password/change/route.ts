import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, withErrorHandling } from '@/lib/auth/api-auth'

export const POST = withErrorHandling(async (request: Request) => {
  await requireAuth()

  const body = await request.json().catch(() => ({})) as {
    currentPassword?: string
    newPassword?: string
  }

  if (!body?.newPassword || typeof body.newPassword !== 'string' || body.newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: body.newPassword })

  if (error) {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
})


