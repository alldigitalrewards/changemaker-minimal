import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, Archive } from 'lucide-react';

type WorkspaceStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

interface StatusBadgeProps {
  status: WorkspaceStatus | string;
  className?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
  },
  INACTIVE: {
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: XCircle,
  },
  ARCHIVED: {
    label: 'Archived',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Archive,
  },
  PUBLISHED: {
    label: 'Published',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
  },
  UNPUBLISHED: {
    label: 'Unpublished',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Clock,
  },
  DRAFT: {
    label: 'Draft',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
  },
} as const;

export function StatusBadge({ status, className, showIcon = false }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase() as keyof typeof STATUS_CONFIG;
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.INACTIVE;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(config.className, 'font-medium', className)}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
