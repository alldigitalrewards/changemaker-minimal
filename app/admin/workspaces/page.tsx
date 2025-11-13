import { getAllWorkspacesWithDetails } from '@/lib/db/queries';
import { WorkspaceManagementTable } from '@/components/admin/workspace-management-table';
import { PlatformAdminWorkspaceDialog } from '@/components/admin/platform-admin-workspace-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Building } from 'lucide-react';

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

      {/* Workspace Table or Empty State */}
      {workspaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No workspaces yet
            </h3>
            <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
              Get started by creating your first workspace. Workspaces are isolated environments where teams can collaborate on challenges.
            </p>
            <PlatformAdminWorkspaceDialog />
          </CardContent>
        </Card>
      ) : (
        <WorkspaceManagementTable workspaces={workspaces} />
      )}
    </div>
  );
}
