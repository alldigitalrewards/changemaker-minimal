import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getUserBySupabaseId, verifyWorkspaceAdmin, listSegments, createSegment } from '@/lib/db/queries'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  const dbUser = await getUserBySupabaseId(user.id)
  if (!dbUser || dbUser.workspaceId !== workspace.id) return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })
  const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id)
  if (!isAdmin) return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })
  const segments = await listSegments(workspace.id)
  return NextResponse.json({ segments })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
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
  const seg = await createSegment(workspace.id, { name: body?.name, description: body?.description, filterJson: body?.filterJson }, dbUser.id)
  return NextResponse.json({ segment: seg }, { status: 201 })
}


