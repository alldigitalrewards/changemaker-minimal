import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isPlatformSuperAdmin } from '@/lib/auth/rbac';
import { getAllPlatformUsers } from '@/lib/db/queries';
import { MembershipManagement } from '@/components/admin/membership-management';

export default async function UsersManagementPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Check if user is platform superadmin
  const isSuperAdmin = isPlatformSuperAdmin(user.permissions || [], user.email);

  if (!isSuperAdmin) {
    redirect('/workspaces');
  }

  // Fetch all users with memberships
  const users = await getAllPlatformUsers();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Membership Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage user memberships and roles across all workspaces
          </p>
        </div>

        {/* Membership Table */}
        <MembershipManagement users={users} />
      </div>
    </div>
  );
}
