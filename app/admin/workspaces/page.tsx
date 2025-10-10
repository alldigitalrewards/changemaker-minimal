import { getAllWorkspacesWithDetails } from '@/lib/db/queries';
import { WorkspaceManagementTable } from '@/components/admin/workspace-management-table';

export default async function WorkspacesManagementPage() {
  // Fetch all workspaces with details
  const workspaces = await getAllWorkspacesWithDetails();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage all workspaces across the platform
        </p>
      </div>

      {/* Workspace Table */}
      <WorkspaceManagementTable workspaces={workspaces} />
    </div>
  );
}
