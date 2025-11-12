/**
 * CSV Export Utilities for Platform Admin
 * Provides functions to generate and download CSV exports of platform data
 */

interface WorkspaceExportData {
  name: string;
  slug: string;
  active: boolean;
  published: boolean;
  rewardStackEnabled: boolean;
  createdAt: Date;
  _count: {
    WorkspaceMembership: number;
    Challenge: number;
  };
  WorkspaceMembership?: {
    User: {
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      displayName?: string | null;
    };
    role: string;
  }[];
}

/**
 * Generate CSV content from workspace data
 * @param workspaces Array of workspace objects
 * @returns CSV string content
 */
export function generateWorkspacesCSV(workspaces: WorkspaceExportData[]): string {
  const headers = [
    'Name',
    'Slug',
    'Members',
    'Challenges',
    'Status',
    'Published',
    'RewardSTACK',
    'Admin Email',
    'Created Date'
  ];

  const rows = workspaces.map(w => {
    const admin = w.WorkspaceMembership?.find(m => m.role === 'ADMIN');
    const adminEmail = admin?.User?.email || 'No admin';

    return [
      w.name,
      w.slug,
      w._count?.WorkspaceMembership || 0,
      w._count?.Challenge || 0,
      w.active ? 'Active' : 'Inactive',
      w.published ? 'Yes' : 'No',
      w.rewardStackEnabled ? 'Enabled' : 'Disabled',
      adminEmail,
      new Date(w.createdAt).toLocaleDateString()
    ];
  });

  // Convert to CSV format
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csv;
}

/**
 * Trigger browser download of CSV content
 * @param csv CSV content string
 * @param filename Desired filename for download
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generate filename with current date
 * @param prefix Filename prefix (e.g., 'workspaces-export')
 * @returns Formatted filename with date
 */
export function generateExportFilename(prefix: string): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${prefix}-${dateStr}.csv`;
}

/**
 * Export workspaces to CSV and trigger download
 * @param workspaces Array of workspace objects
 */
export function exportWorkspacesToCSV(workspaces: WorkspaceExportData[]): void {
  const csv = generateWorkspacesCSV(workspaces);
  const filename = generateExportFilename('workspaces-export');
  downloadCSV(csv, filename);
}
