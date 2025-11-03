import { getAllWorkspacesWithDetails } from '@/lib/db/queries';
import { WorkspaceManagementTable } from '@/components/admin/workspace-management-table';
import { PlatformAdminWorkspaceDialog } from '@/components/admin/platform-admin-workspace-dialog';

export default async function WorkspacesManagementPage() {
  // Fetch all workspaces with details
  const workspaces = await getAllWorkspacesWithDetails();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspace Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage all workspaces across the platform
          </p>
        </div>
        <PlatformAdminWorkspaceDialog />
      </div>

      {/* Workspace Table */}
      <WorkspaceManagementTable workspaces={workspaces} />
    </div>
  );
}
