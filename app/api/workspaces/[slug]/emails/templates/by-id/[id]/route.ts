import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace } from '@/lib/workspace-context'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getCurrentWorkspace(slug)
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Get user from workspace membership
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId: workspace.id,
        supabaseUserId: user.id,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this workspace' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      subject,
      html,
      conversationHistory,
      incrementVersion = false,
    } = body

    // Find existing template
    const existingTemplate = await prisma.workspaceEmailTemplate.findUnique({
      where: { id },
    })

    if (!existingTemplate || existingTemplate.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    if (incrementVersion) {
      // Create new version
      const conversationHistoryData = conversationHistory
        ? [...(existingTemplate.conversationHistory as any[] || []), ...conversationHistory]
        : (existingTemplate.conversationHistory as any)

      const newVersion = await prisma.workspaceEmailTemplate.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId: workspace.id,
          type: existingTemplate.type,
          name: existingTemplate.name,
          description: existingTemplate.description,
          subject,
          html,
          enabled: existingTemplate.enabled,
          tags: existingTemplate.tags,
          conversationHistory: JSON.parse(JSON.stringify(conversationHistoryData)),
          aiModel: existingTemplate.aiModel,
          generatedByAI: existingTemplate.generatedByAI,
          version: existingTemplate.version + 1,
          previousVersionId: existingTemplate.id,
          updatedBy: membership.userId,
        },
      })

      return NextResponse.json({ template: newVersion })
    } else {
      // Update existing template
      const conversationHistoryData = conversationHistory
        ? [...(existingTemplate.conversationHistory as any[] || []), ...conversationHistory]
        : (existingTemplate.conversationHistory as any)

      const updated = await prisma.workspaceEmailTemplate.update({
        where: { id },
        data: {
          subject,
          html,
          conversationHistory: JSON.parse(JSON.stringify(conversationHistoryData)),
          updatedBy: membership.userId,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ template: updated })
    }
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}
