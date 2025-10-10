import { getPlatformStats } from '@/lib/db/queries';
import { PlatformOverviewCards } from '@/components/admin/platform-overview-cards';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, UserCog, Building } from 'lucide-react';

export default async function AdminDashboard() {
  // Fetch platform statistics
  const stats = await getPlatformStats();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-600 mt-1">
          Monitor platform-wide metrics and manage all workspaces
        </p>
      </div>

      {/* Platform Statistics */}
      <PlatformOverviewCards stats={stats} />

      {/* Quick Actions */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common platform administration tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/workspaces"
              className="group block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Workspaces</h3>
                  <p className="text-sm text-gray-600 mt-1">View and manage all platform workspaces</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/users"
              className="group block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
                  <UserCog className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Members</h3>
                  <p className="text-sm text-gray-600 mt-1">View and manage all platform users</p>
                </div>
              </div>
            </Link>
            <Link
              href="/workspaces"
              className="group block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Your Workspaces</h3>
                  <p className="text-sm text-gray-600 mt-1">Access your workspace memberships</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
