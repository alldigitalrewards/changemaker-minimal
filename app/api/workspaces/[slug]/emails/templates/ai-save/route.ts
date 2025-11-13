import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace } from '@/lib/workspace-context'
import { prisma } from '@/lib/prisma'
import { EmailTemplateType } from '@prisma/client'

export async function POST(
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

    const body = await request.json()
    const {
      name,
      type,
      subject,
      html,
      description,
      tags = [],
      conversationHistory,
      aiModel,
      updateExisting,
      existingTemplateId,
    } = body

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    // Validate type
    if (!Object.values(EmailTemplateType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid template type' },
        { status: 400 }
      )
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

    // If updating existing template
    if (updateExisting && existingTemplateId) {
      const existingTemplate = await prisma.workspaceEmailTemplate.findUnique({
        where: { id: existingTemplateId },
      })

      if (!existingTemplate || existingTemplate.workspaceId !== workspace.id) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      // Create new version
      const newVersion = await prisma.workspaceEmailTemplate.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId: workspace.id,
          type: existingTemplate.type,
          name: existingTemplate.name,
          description: description || existingTemplate.description,
          subject,
          html,
          enabled: existingTemplate.enabled,
          tags: tags.length > 0 ? tags : existingTemplate.tags,
          conversationHistory: conversationHistory || existingTemplate.conversationHistory,
          aiModel: aiModel || existingTemplate.aiModel,
          generatedByAI: true,
          version: existingTemplate.version + 1,
          previousVersionId: existingTemplate.id,
          updatedBy: membership.userId,
        },
      })

      return NextResponse.json({ template: newVersion })
    }

    // Check for duplicate name within workspace and type
    const existingWithName = await prisma.workspaceEmailTemplate.findFirst({
      where: {
        workspaceId: workspace.id,
        type,
        name,
      },
    })

    if (existingWithName) {
      return NextResponse.json(
        { error: 'A template with this name already exists for this type' },
        { status: 409 }
      )
    }

    // Create new template
    const template = await prisma.workspaceEmailTemplate.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        type,
        name,
        description,
        subject,
        html,
        enabled: true,
        tags,
        conversationHistory,
        aiModel,
        generatedByAI: true,
        version: 1,
        updatedBy: membership.userId,
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error saving AI template:', error)
    return NextResponse.json(
      { error: 'Failed to save template' },
      { status: 500 }
    )
  }
}
