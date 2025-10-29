import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getUserBySupabaseId, verifyWorkspaceAdmin, getWorkspaceEmailSettings } from '@/lib/db/queries'
import { getTransport } from '@/lib/email/smtp'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const body = await request.json().catch(() => ({}))
  const to = body?.to as string | undefined
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })

  const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id)
  if (!isAdmin) return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })

  const settings = await getWorkspaceEmailSettings(workspace.id)
  const fromName = settings?.fromName || process.env.EMAIL_FROM_NAME || 'Changemaker'
  const fromEmail = settings?.fromEmail || process.env.EMAIL_FROM || 'team@updates.changemaker.im'

  const transporter = getTransport()
  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: to || dbUser.email,
    subject: `Test email for workspace ${workspace.name}`,
    html: `<div>Test email from <strong>${workspace.name}</strong>. If you can read this, SMTP settings are working.</div>`
  })

  return NextResponse.json({ ok: true })
}


