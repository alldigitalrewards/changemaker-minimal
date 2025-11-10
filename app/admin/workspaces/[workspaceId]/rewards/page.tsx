import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PlatformRewardsClient } from '@/components/admin/platform-rewards-client';

interface PageProps {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function PlatformAdminRewardsPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  // Fetch workspace
  const workspace = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      rewardStackEnabled: true,
    },
  });

  if (!workspace) {
    notFound();
  }

  // Pagination
  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  // Fetch reward issuances
  const [issuances, totalCount] = await Promise.all([
    prisma.rewardIssuance.findMany({
      where: { workspaceId: workspace.id },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
        IssuedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.rewardIssuance.count({
      where: { workspaceId: workspace.id },
    }),
  ]);

  // Calculate statistics
  const stats = await prisma.rewardIssuance.groupBy({
    by: ['status'],
    where: { workspaceId: workspace.id },
    _count: true,
  });

  const statusCounts = {
    PENDING: stats.find((s) => s.status === 'PENDING')?._count || 0,
    ISSUED: stats.find((s) => s.status === 'ISSUED')?._count || 0,
    FAILED: stats.find((s) => s.status === 'FAILED')?._count || 0,
    CANCELLED: stats.find((s) => s.status === 'CANCELLED')?._count || 0,
  };

  const totalIssued = await prisma.rewardIssuance.aggregate({
    where: {
      workspaceId: workspace.id,
      status: 'ISSUED',
    },
    _sum: {
      amount: true,
    },
  });

  return (
    <PlatformRewardsClient
      workspace={workspace}
      issuances={issuances}
      totalCount={totalCount}
      statusCounts={statusCounts}
      totalIssued={totalIssued._sum.amount || 0}
      page={page}
      pageSize={pageSize}
    />
  );
}
