import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Database, Mail, Shield, Zap, Bell } from 'lucide-react';

export default async function PlatformSettingsPage() {
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
