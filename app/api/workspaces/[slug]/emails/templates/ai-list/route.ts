import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace } from '@/lib/workspace-context'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getCurrentWorkspace(slug)
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Fetch all templates with AI metadata
    const templates = await prisma.workspaceEmailTemplate.findMany({
      where: {
        workspaceId: workspace.id,
      },
      orderBy: [
        { generatedByAI: 'desc' }, // AI templates first
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        subject: true,
        html: true,
        enabled: true,
        generatedByAI: true,
        aiModel: true,
        tags: true,
        version: true,
        updatedAt: true,
        conversationHistory: true,
      },
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching AI templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}
