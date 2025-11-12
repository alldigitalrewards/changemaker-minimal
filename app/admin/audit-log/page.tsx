import { getPlatformAuditLog, getAllWorkspacesWithDetails } from '@/lib/db/queries';
import { AuditLogTable } from '@/components/admin/audit-log-table';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditLogPageProps {
  searchParams: Promise<{
    page?: string;
    eventType?: string;
    workspaceId?: string;
  }>;
}

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const eventType = params.eventType;
  const workspaceId = params.workspaceId;

  // Fetch audit log and workspaces for filter dropdown
  const [auditLog, workspaces] = await Promise.all([
    getPlatformAuditLog({
      page,
      limit: 50,
      eventType,
      workspaceId
    }),
    getAllWorkspacesWithDetails()
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-600 mt-1">
          Platform-wide activity and event tracking
        </p>
      </div>

      {/* Audit Log Table */}
      <Suspense fallback={<Skeleton className="h-96" />}>
        <AuditLogTable
          auditLog={auditLog}
          workspaces={workspaces}
          currentFilters={{
            eventType: eventType || 'ALL',
            workspaceId: workspaceId || 'ALL'
          }}
        />
      </Suspense>
    </div>
  );
}
