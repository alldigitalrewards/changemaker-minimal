import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getUserBySupabaseId, verifyWorkspaceAdmin, getWorkspaceEmailTemplate, upsertWorkspaceEmailTemplate } from '@/lib/db/queries'
import { EmailTemplateType } from '@prisma/client'

function parseType(param: string): EmailTemplateType | null {
  const upper = param.toUpperCase() as EmailTemplateType
  return Object.values(EmailTemplateType).includes(upper) ? upper : null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string, type: string }> }
) {
  const { slug, type } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const templateType = parseType(type)
  if (!templateType) return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })

  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })

  const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id)
  if (!isAdmin) return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })

  const template = await getWorkspaceEmailTemplate(workspace.id, templateType)
  return NextResponse.json({ template })
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string, type: string }> }
) {
  const { slug, type } = await context.params
  const body = await request.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const templateType = parseType(type)
  if (!templateType) return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })

  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser) return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })

  const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id)
  if (!isAdmin) return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })

  const { subject, html, enabled } = body || {}
  const updated = await upsertWorkspaceEmailTemplate(workspace.id, templateType, { subject, html, enabled }, dbUser.id)
  return NextResponse.json({ template: updated })
}


