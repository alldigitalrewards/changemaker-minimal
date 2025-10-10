import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isPlatformSuperAdmin } from '@/lib/auth/rbac';
import { getAllWorkspacesWithDetails } from '@/lib/db/queries';
import { WorkspaceManagementTable } from '@/components/admin/workspace-management-table';

export default async function WorkspacesManagementPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Check if user is platform superadmin
  const isSuperAdmin = isPlatformSuperAdmin(user.permissions || [], user.email);

  if (!isSuperAdmin) {
    redirect('/workspaces');
  }

  // Fetch all workspaces with details
  const workspaces = await getAllWorkspacesWithDetails();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workspace Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all workspaces across the platform
          </p>
        </div>

        {/* Workspace Table */}
        <WorkspaceManagementTable workspaces={workspaces} />
      </div>
    </div>
  );
}
