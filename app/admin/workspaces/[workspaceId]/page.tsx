import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ExternalLink,
  Users,
  Trophy,
  Award,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { getUserDisplayName } from '@/lib/user-utils';
import { WorkspaceDetailHeader } from '@/components/admin/workspace-detail-header';
import { PlatformRewardStackConfig } from '@/components/admin/platform-rewardstack-config';

interface PageProps {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function WorkspaceDetailPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  // Fetch workspace details with all related data
  const workspace = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      published: true,
      createdAt: true,
      tenantId: true,
      // RewardSTACK fields for Platform Admin config
      rewardStackEnabled: true,
      rewardStackEnvironment: true,
      rewardStackOrgId: true,
      rewardStackProgramId: true,
      rewardStackSandboxMode: true,
      // Relations
      WorkspaceMembership: {
        select: {
          id: true,
          role: true,
          User: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              displayName: true,
              company: true,
              phone: true,
            },
          },
        },
      },
      _count: {
        select: {
          WorkspaceMembership: true,
          Challenge: true,
        },
      },
    },
  });

  if (!workspace) {
    notFound();
  }

  const admin = workspace.WorkspaceMembership.find((m: { role: string }) => m.role === 'ADMIN');
  const activeTab = searchParams.tab || 'overview';

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/admin/workspaces" className="hover:text-purple-700">
            Workspaces
          </Link>
          <span>/</span>
          <span className="text-gray-900">{workspace.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{workspace.name}</h1>
              {workspace.active && workspace.published ? (
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              ) : workspace.active ? (
                <Badge className="bg-yellow-100 text-yellow-800">Inactive</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Archived</Badge>
              )}
              {workspace.rewardStackEnabled && (
                <Badge className="bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  RewardSTACK
                </Badge>
              )}
            </div>
            <p className="text-gray-600">
              <span className="font-mono text-sm">/w/{workspace.slug}</span>
            </p>
          </div>

          <WorkspaceDetailHeader
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            workspaceSlug={workspace.slug}
          />
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspace._count.WorkspaceMembership}</div>
            <p className="text-xs text-muted-foreground">
              Active workspace members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Challenges</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspace._count.Challenge}</div>
            <p className="text-xs text-muted-foreground">
              Total challenges created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(workspace.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(workspace.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenant ID</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono">{workspace.tenantId}</div>
            <p className="text-xs text-muted-foreground">
              Database tenant
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue={activeTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="rewardstack">RewardSTACK</TabsTrigger>
          <TabsTrigger value="points">Points Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Workspace Information */}
          <Card>
            <CardHeader>
              <CardTitle>Workspace Information</CardTitle>
              <CardDescription>
                Basic workspace configuration and details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Workspace Name</label>
                  <p className="text-sm text-gray-900 mt-1">{workspace.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Slug</label>
                  <p className="text-sm text-gray-900 mt-1 font-mono">{workspace.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {workspace.active && workspace.published ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-900">Active and Published</span>
                      </>
                    ) : workspace.active ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-gray-900">Active but Unpublished</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-900">Archived</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(workspace.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Information */}
          <Card>
            <CardHeader>
              <CardTitle>Workspace Administrator</CardTitle>
              <CardDescription>
                Primary admin user for this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {admin ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900 mt-1">{getUserDisplayName(admin.User)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900 mt-1">{admin.User.email}</p>
                  </div>
                  {admin.User.company && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Company</label>
                      <p className="text-sm text-gray-900 mt-1">{admin.User.company}</p>
                    </div>
                  )}
                  {admin.User.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900 mt-1">{admin.User.phone}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No admin assigned to this workspace</p>
                  <Button className="mt-4" variant="outline">
                    Assign Admin
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Member Management</CardTitle>
              <CardDescription>
                View and manage workspace members, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">Member management coming soon</p>
                <p className="text-sm">
                  Platform admin member management interface will be available here
                </p>
                <Button className="mt-6" variant="outline" asChild>
                  <Link href={`/w/${workspace.slug}/admin/participants`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Workspace Admin
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewardstack">
          <Card>
            <CardHeader>
              <CardTitle>RewardSTACK Configuration</CardTitle>
              <CardDescription>
                Manage RewardSTACK marketplace integration for this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformRewardStackConfig
                workspaceId={workspace.id}
                initialEnabled={workspace.rewardStackEnabled}
                initialProgramId={workspace.rewardStackProgramId || undefined}
                initialOrgId={workspace.rewardStackOrgId || undefined}
                initialEnvironment={workspace.rewardStackEnvironment || undefined}
                defaultUsername={process.env.REWARDSTACK_USERNAME}
                defaultPassword={process.env.REWARDSTACK_PASSWORD}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle>Points Budget Management</CardTitle>
              <CardDescription>
                Configure and monitor workspace points budget and allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">Points budget management coming soon</p>
                <p className="text-sm">
                  Workspace-level points budget configuration will be available here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
