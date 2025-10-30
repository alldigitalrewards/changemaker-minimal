import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getWorkspaceBySlug,
  getUserBySupabaseId,
  verifyWorkspaceAdmin,
  getWorkspacePointsBudget,
  upsertWorkspacePointsBudget,
  DatabaseError,
  WorkspaceAccessError,
} from '@/lib/db/queries'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const workspace = await getWorkspaceBySlug(slug)
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) {
      return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })
    }

    const budget = await getWorkspacePointsBudget(workspace.id as any)
    return NextResponse.json({ budget: budget || null })
  } catch (error) {
    if (error instanceof DatabaseError) return NextResponse.json({ error: error.message }, { status: 500 })
    if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    return NextResponse.json({ error: 'Failed to fetch workspace points budget' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const body = await request.json().catch(() => ({})) as { totalBudget?: number }
    const totalBudget = typeof body.totalBudget === 'number' ? body.totalBudget : Number(body.totalBudget)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const workspace = await getWorkspaceBySlug(slug)
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) {
      return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 })
    }

    const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspace.id)
    if (!isAdmin) return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })

    const updated = await upsertWorkspacePointsBudget(workspace.id as any, isNaN(totalBudget) ? 0 : Math.max(0, totalBudget), dbUser.id)
    return NextResponse.json({ budget: updated })
  } catch (error) {
    if (error instanceof DatabaseError) return NextResponse.json({ error: error.message }, { status: 500 })
    if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    return NextResponse.json({ error: 'Failed to update workspace points budget' }, { status: 500 })
  }
}


