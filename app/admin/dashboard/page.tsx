import { getPlatformStats, getPlatformRecentActivity, getWorkspaceHealthMetrics } from '@/lib/db/queries';
import { PlatformOverviewCards } from '@/components/admin/platform-overview-cards';
import { RecentActivityFeed } from '@/components/admin/recent-activity-feed';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, UserCog, Building, CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react';

export default async function AdminDashboard() {
  // Fetch platform statistics, health metrics, and recent activity
  const [stats, healthMetrics, recentActivity] = await Promise.all([
    getPlatformStats(),
    getWorkspaceHealthMetrics(),
    getPlatformRecentActivity(10)
  ]);

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

      {/* Workspace Health Indicators */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Workspace Health</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Active Workspaces */}
          <Card className="border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workspaces</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">{healthMetrics.activeCount}</div>
              <p className="text-xs text-gray-600 mt-1">
                Workspaces currently active
              </p>
            </CardContent>
          </Card>

          {/* Inactive Workspaces */}
          <Card className="border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Workspaces</CardTitle>
              <XCircle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">{healthMetrics.inactiveCount}</div>
              <p className="text-xs text-gray-600 mt-1">
                Workspaces marked inactive
              </p>
            </CardContent>
          </Card>

          {/* Workspaces Without Owners */}
          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Owner</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{healthMetrics.withoutOwners}</div>
              <p className="text-xs text-gray-600 mt-1">
                Workspaces missing owner
              </p>
            </CardContent>
          </Card>

          {/* Workspaces Without Challenges */}
          <Card className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Challenges</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">{healthMetrics.withoutChallenges}</div>
              <p className="text-xs text-gray-600 mt-1">
                Empty workspaces
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <RecentActivityFeed events={recentActivity} />

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
