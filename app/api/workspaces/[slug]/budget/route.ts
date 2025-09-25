import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getUserBySupabaseId, verifyWorkspaceAdmin, getWorkspacePointsBudget } from '@/lib/db/queries'

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
  if (!dbUser || dbUser.workspaceId !== workspace.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id)
  if (!isAdmin) return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })
  const budget = await getWorkspacePointsBudget(workspace.id)
  return NextResponse.json({ budget })
}


