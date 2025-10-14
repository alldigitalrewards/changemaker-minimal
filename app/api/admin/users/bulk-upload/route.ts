import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { isPlatformSuperAdmin } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is superadmin
    const currentUser = await prisma.user.findUnique({
      where: { email: user.email! }
    });

    if (!isPlatformSuperAdmin(currentUser?.permissions, user.email!)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
    }

    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim());
    if (!headers.includes('email') || !headers.includes('workspaceSlug') || !headers.includes('role')) {
      return NextResponse.json(
        { error: 'CSV must include email, workspaceSlug, and role columns' },
        { status: 400 }
      );
    }

    const emailIndex = headers.indexOf('email');
    const workspaceIndex = headers.indexOf('workspaceSlug');
    const roleIndex = headers.indexOf('role');

    let created = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const email = values[emailIndex];
      const workspaceSlug = values[workspaceIndex];
      const role = values[roleIndex];

      try {
        // Validate role
        if (role !== 'ADMIN' && role !== 'PARTICIPANT') {
          errors.push(`Row ${i + 1}: Invalid role "${role}"`);
          continue;
        }

        // Find or create user
        let dbUser = await prisma.user.findUnique({
          where: { email },
          include: { WorkspaceMembership: true }
        });

        if (!dbUser) {
          // Create user via Supabase Auth
          const adminSupabase = createClient();
          const { data: authData, error: authError } = await (await adminSupabase).auth.admin.createUser({
            email,
            email_confirm: true,
            password: Math.random().toString(36).slice(-12), // Temporary password
          });

          if (authError || !authData.user) {
            errors.push(`Row ${i + 1}: Failed to create auth user for ${email}`);
            continue;
          }

          // Create user in database
          dbUser = await prisma.user.create({
            data: {
              email,
              supabaseUserId: authData.user.id,
              role: 'PARTICIPANT', // Default role
            },
            include: { WorkspaceMembership: true }
          });
        }

        if (!dbUser) {
          errors.push(`Row ${i + 1}: Failed to create user for ${email}`);
          continue;
        }

        // Find workspace
        const workspace = await prisma.workspace.findUnique({
          where: { slug: workspaceSlug }
        });

        if (!workspace) {
          errors.push(`Row ${i + 1}: Workspace "${workspaceSlug}" not found`);
          continue;
        }

        // Check if membership exists
        const existing = await prisma.workspaceMembership.findUnique({
          where: {
            userId_workspaceId: {
              userId: dbUser.id,
              workspaceId: workspace.id
            }
          }
        });

        if (existing) {
          errors.push(`Row ${i + 1}: ${email} is already a member of ${workspaceSlug}`);
          continue;
        }

        // Create membership
        const isPrimary = dbUser.WorkspaceMembership.length === 0;
        await prisma.workspaceMembership.create({
          data: {
            userId: dbUser.id,
            workspaceId: workspace.id,
            role,
            isPrimary
          }
        });

        created++;
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: ${email} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({ created, errors });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
}
