import { getAllPlatformUsers } from '@/lib/db/queries';
import { MembershipManagement } from '@/components/admin/membership-management';

export default async function UsersManagementPage() {
  // Fetch all users with memberships
  const users = await getAllPlatformUsers();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Membership Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage user memberships and roles across all workspaces
        </p>
      </div>

      {/* Membership Table */}
      <MembershipManagement users={users} />
    </div>
  );
}
