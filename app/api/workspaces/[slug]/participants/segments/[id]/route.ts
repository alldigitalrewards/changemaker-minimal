import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getUserBySupabaseId, verifyWorkspaceAdmin, updateSegment, deleteSegment } from '@/lib/db/queries'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string, id: string }> }
) {
  const { slug, id } = await context.params
  const body = await request.json().catch(() => ({}))
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser || dbUser.workspaceId !== workspace.id) return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })
  const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id)
  if (!isAdmin) return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })
  const seg = await updateSegment(id, workspace.id, { name: body?.name, description: body?.description, filterJson: body?.filterJson })
  return NextResponse.json({ segment: seg })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string, id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser || dbUser.workspaceId !== workspace.id) return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })
  const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id)
  if (!isAdmin) return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })
  await deleteSegment(id, workspace.id)
  return NextResponse.json({ ok: true })
}


