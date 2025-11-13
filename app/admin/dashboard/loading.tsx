import { PlatformStatsSkeleton, QuickActionsSkeleton } from "@/components/admin/platform-stats-skeleton";

export default function AdminDashboardLoading() {
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
      <PlatformStatsSkeleton />

      {/* Quick Actions */}
      <QuickActionsSkeleton />
    </div>
  );
}
