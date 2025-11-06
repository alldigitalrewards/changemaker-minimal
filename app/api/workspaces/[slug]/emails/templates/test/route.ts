import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getUserBySupabaseId, verifyWorkspaceAdmin, getWorkspaceEmailSettings } from '@/lib/db/queries'
import { sendEmail } from '@/lib/email/resend-api'
import { getSampleData, replaceVariables } from '@/lib/email/template-variables'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const body = await request.json().catch(() => ({}))
  const { to, subject, html, templateType } = body as {
    to?: string
    subject: string
    html: string
    templateType: string
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })

  const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id)
  if (!isAdmin) return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })

  if (!subject || !html) {
    return NextResponse.json({ error: 'Subject and HTML are required' }, { status: 400 })
  }

  const settings = await getWorkspaceEmailSettings(workspace.id)
  const fromName = settings?.fromName || process.env.EMAIL_FROM_NAME || 'Changemaker'
  const fromEmail = settings?.fromEmail || process.env.EMAIL_FROM || 'team@updates.changemaker.im'

  // Get sample data with workspace-specific overrides
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const sampleData = getSampleData({
    recipientName: dbUser.displayName || dbUser.email.split('@')[0],
    workspaceName: workspace.name,
    workspaceUrl: `${appUrl}/w/${slug}`,
    actionUrl: `${appUrl}/w/${slug}`,
    inviteUrl: `${appUrl}/w/${slug}/invites/test`,
    challengeUrl: `${appUrl}/w/${slug}/challenges/sample-challenge`,
    inviterName: dbUser.displayName || 'Admin User',
    senderName: fromName,
    supportEmail: settings?.replyTo || fromEmail,
    replyToEmail: settings?.replyTo || fromEmail,
  })

  // Replace variables in subject and HTML
  const processedSubject = replaceVariables(subject, sampleData)
  const processedHtml = replaceVariables(html, sampleData)

  try {
    await sendEmail({
      to: to || dbUser.email,
      subject: processedSubject,
      html: processedHtml,
      from: {
        name: fromName,
        email: fromEmail
      }
    })

    return NextResponse.json({ ok: true, sentTo: to || dbUser.email })
  } catch (error) {
    console.error('Failed to send test email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
