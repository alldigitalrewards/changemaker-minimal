import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Database, Mail, Shield, Zap, Bell, ShoppingCart, CheckCircle, XCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export default async function PlatformSettingsPage() {
  // Get RewardSTACK configuration from environment
  const rewardStackConfig = {
    programId: process.env.REWARDSTACK_PROGRAM_ID || 'Not configured',
    orgId: process.env.REWARDSTACK_ORG_ID || 'Not configured',
    environment: process.env.REWARDSTACK_ENVIRONMENT || 'Not configured',
    apiKey: process.env.REWARDSTACK_API_KEY ? '••••••••••••••••' : 'Not configured'
  };

  // Get list of workspaces with RewardSTACK status
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      rewardStackEnabled: true,
      rewardStackEnvironment: true
    },
    orderBy: { name: 'asc' }
  });
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Configure platform-wide settings and preferences
        </p>
      </div>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card className="border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Platform name, branding, and basic configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Platform Name</label>
                <p className="text-sm text-gray-500 mt-1">Changemaker</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Platform URL</label>
                <p className="text-sm text-gray-500 mt-1">changemaker.im</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Configure (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card className="border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Database & Storage</CardTitle>
                <CardDescription>Database configuration and backup settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Database Provider</label>
                <p className="text-sm text-gray-500 mt-1">Supabase PostgreSQL</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Storage Provider</label>
                <p className="text-sm text-gray-500 mt-1">Supabase Storage</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Configure (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card className="border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>Platform-wide email settings and templates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Provider</label>
                <p className="text-sm text-gray-500 mt-1">Resend</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">From Address</label>
                <p className="text-sm text-gray-500 mt-1">team@updates.changemaker.im</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Configure (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Security & Authentication</CardTitle>
                <CardDescription>Platform security and auth configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Auth Provider</label>
                <p className="text-sm text-gray-500 mt-1">Supabase Auth</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">MFA Status</label>
                <p className="text-sm text-gray-500 mt-1">Optional</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Configure (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card className="border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>Public API access and rate limiting</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">API Status</label>
                <p className="text-sm text-gray-500 mt-1">Enabled</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Rate Limit</label>
                <p className="text-sm text-gray-500 mt-1">1000 requests/hour</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Configure (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Platform notification preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                <p className="text-sm text-gray-500 mt-1">Enabled</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">System Alerts</label>
                <p className="text-sm text-gray-500 mt-1">Enabled</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Configure (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RewardSTACK Integration Section */}
      <div className="border-t border-gray-200 pt-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-purple-600" />
            RewardSTACK Integration
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Platform-wide configuration for AllDigitalRewards marketplace integration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Platform Configuration */}
          <Card className="border-purple-200 col-span-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Platform Configuration</CardTitle>
                  <CardDescription>Global RewardSTACK settings managed via environment variables</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Program ID</label>
                  <p className={`text-sm mt-1 font-mono ${rewardStackConfig.programId !== 'Not configured' ? 'text-gray-900' : 'text-gray-400'}`}>
                    {rewardStackConfig.programId}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    QA Environment: <code className="bg-gray-100 px-1 rounded">adr-changemaker-qa</code>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Organization ID</label>
                  <p className={`text-sm mt-1 font-mono ${rewardStackConfig.orgId !== 'Not configured' ? 'text-gray-900' : 'text-gray-400'}`}>
                    {rewardStackConfig.orgId}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    QA Organization: <code className="bg-gray-100 px-1 rounded">alldigitalrewards</code>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Environment</label>
                  <p className={`text-sm mt-1 font-mono ${rewardStackConfig.environment !== 'Not configured' ? 'text-gray-900' : 'text-gray-400'}`}>
                    {rewardStackConfig.environment}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Options: <code className="bg-gray-100 px-1 rounded">QA</code> or <code className="bg-gray-100 px-1 rounded">PRODUCTION</code>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">API Key</label>
                  <p className={`text-sm mt-1 font-mono ${rewardStackConfig.apiKey !== 'Not configured' ? 'text-gray-900' : 'text-gray-400'}`}>
                    {rewardStackConfig.apiKey}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Encrypted and stored securely
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Configuration Instructions</h4>
                <p className="text-sm text-blue-800 mb-3">
                  To configure RewardSTACK integration, add these environment variables to your <code className="bg-blue-100 px-1 rounded">.env.local</code> file:
                </p>
                <pre className="text-xs bg-blue-100 p-3 rounded overflow-x-auto text-blue-900">
{`REWARDSTACK_PROGRAM_ID=adr-changemaker-qa
REWARDSTACK_ORG_ID=alldigitalrewards
REWARDSTACK_ENVIRONMENT=QA
REWARDSTACK_API_KEY=your_api_key_here`}
                </pre>
                <p className="text-xs text-blue-700 mt-2">
                  QA Marketplace URL: <a href="https://changemaker.adrsandbox.com" target="_blank" rel="noopener" className="underline">changemaker.adrsandbox.com</a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Workspace Status */}
          <Card className="border-purple-200 col-span-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Workspace Status</CardTitle>
                  <CardDescription>RewardSTACK enablement status for all workspaces</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {workspaces.length === 0 ? (
                <p className="text-sm text-gray-500">No workspaces found</p>
              ) : (
                <div className="space-y-2">
                  {workspaces.map((workspace) => (
                    <div key={workspace.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{workspace.name}</div>
                        <div className="text-sm text-gray-500">/{workspace.slug}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {workspace.rewardStackEnvironment && (
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                            {workspace.rewardStackEnvironment}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          {workspace.rewardStackEnabled ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="text-sm font-medium text-green-700">Enabled</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-gray-400" />
                              <span className="text-sm text-gray-500">Disabled</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                <p className="font-medium mb-1">Note</p>
                <p>Workspace administrators can enable/disable RewardSTACK for their workspace in Workspace Settings. The platform configuration above applies to all enabled workspaces.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Warning Card */}
      <Card className="border-amber-300 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">Configuration Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-800">
            Platform settings configuration is currently managed through environment variables and configuration files.
            A UI-based configuration interface will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
