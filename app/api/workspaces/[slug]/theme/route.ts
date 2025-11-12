import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceRole } from "@/lib/workspace-context";
import { isValidTheme } from "@/lib/theme/utils";

/**
 * PATCH /api/workspaces/[slug]/theme
 * Update workspace theme (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is workspace admin
    const role = await getUserWorkspaceRole(slug);
    if (role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only workspace admins can change the theme" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { theme } = body;

    if (!theme || typeof theme !== "string") {
      return NextResponse.json(
        { error: "Theme is required and must be a string" },
        { status: 400 }
      );
    }

    if (!isValidTheme(theme)) {
      return NextResponse.json(
        {
          error: `Invalid theme. Must be one of: bold, professional, minimal, current`,
        },
        { status: 400 }
      );
    }

    // Update workspace theme
    const workspace = await prisma.workspace.update({
      where: { slug },
      data: { theme },
      select: {
        id: true,
        slug: true,
        name: true,
        theme: true,
      },
    });

    return NextResponse.json({ workspace }, { status: 200 });
  } catch (error) {
    console.error("Error updating workspace theme:", error);
    return NextResponse.json(
      { error: "Failed to update theme" },
      { status: 500 }
    );
  }
}
