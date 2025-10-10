import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isPlatformSuperAdmin } from '@/lib/auth/rbac';
import { getPlatformStats } from '@/lib/db/queries';
import { PlatformOverviewCards } from '@/components/admin/platform-overview-cards';

export default async function AdminDashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Check if user is platform superadmin
  const isSuperAdmin = isPlatformSuperAdmin(user.permissions || [], user.email);

  if (!isSuperAdmin) {
    // Regular admins should not access this page - redirect to workspace selection
    redirect('/workspaces');
  }

  // Fetch platform statistics
  const stats = await getPlatformStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor platform-wide metrics and manage all workspaces
          </p>
        </div>

        {/* Platform Statistics */}
        <PlatformOverviewCards stats={stats} />

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="bg-white rounded-lg border border-purple-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/admin/workspaces"
                className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Manage Workspaces</h3>
                <p className="text-sm text-gray-600 mt-1">View and manage all platform workspaces</p>
              </a>
              <a
                href="/admin/users"
                className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Manage Members</h3>
                <p className="text-sm text-gray-600 mt-1">View and manage all platform users</p>
              </a>
              <a
                href="/workspaces"
                className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Your Workspaces</h3>
                <p className="text-sm text-gray-600 mt-1">Access your workspace memberships</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
