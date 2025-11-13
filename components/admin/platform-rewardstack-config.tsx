"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, ExternalLink, Loader2, AlertCircle, Users, Package, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  success: boolean;
  message: string;
  warning?: string;
  program?: {
    name: string;
    uniqueId: string;
    url: string;
    active: boolean;
    published: boolean;
    organization: string;
    startDate: string;
    endDate: string | null;
    timezone: string;
    pointValue: number;
    featuredProducts: string[];
    productCount: number;
    programTypes: string[];
  };
  stats?: {
    participantCount: number;
    catalogCount: number;
    topSkus: Array<{
      skuId: string;
      name: string;
      price: number;
      points: number;
    }>;
  };
}

interface PlatformRewardStackConfigProps {
  workspaceId: string;
  initialEnabled: boolean;
  initialProgramId?: string;
  initialOrgId?: string;
  initialEnvironment?: string;
  defaultUsername?: string;
  defaultPassword?: string;
}

export function PlatformRewardStackConfig({
  workspaceId,
  initialEnabled,
  initialProgramId,
  initialOrgId,
  initialEnvironment,
  defaultUsername,
  defaultPassword,
}: PlatformRewardStackConfigProps) {
  const { toast } = useToast();
  const [programId, setProgramId] = useState(initialProgramId || "");
  const [orgId, setOrgId] = useState(initialOrgId || "");
  const [username, setUsername] = useState(defaultUsername || "");
  const [password, setPassword] = useState(defaultPassword || "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/workspaces/${workspaceId}/rewardstack/config`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programId,
            orgId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save configuration");
      }

      toast({
        title: "Configuration saved",
        description: "RewardSTACK configuration has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(
        `/api/admin/workspaces/${workspaceId}/rewardstack/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programId,
            orgId,
            username,
            password,
            environment: initialEnvironment || "QA",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection test failed");
      }

      setTestResult(data);
      toast({
        title: "Connection successful",
        description: data.message || "Successfully connected to RewardSTACK API",
      });
    } catch (error) {
      setTestResult(null);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to RewardSTACK",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Status */}
      <div>
        <label className="text-sm font-medium text-gray-700">Integration Status</label>
        <div className="flex items-center gap-2 mt-2">
          {initialEnabled ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Enabled</span>
              <Badge className="bg-green-100 text-green-800 ml-2">Active</Badge>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Not enabled</span>
            </>
          )}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          Default Platform Configuration
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Configure default RewardSTACK credentials used by all workspaces. These are QA
          environment defaults.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="programId">Program ID *</Label>
              <Input
                id="programId"
                name="programId"
                placeholder="adr-changemaker-qa"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="orgId">Organization ID</Label>
              <Input
                id="orgId"
                name="orgId"
                placeholder="alldigitalrewards"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="environment">Environment</Label>
              <Input
                id="environment"
                name="environment"
                placeholder="QA"
                value={initialEnvironment || "QA"}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="marketplace">QA Marketplace</Label>
              <div className="flex items-center gap-2 mt-2">
                <a
                  href="https://changemaker.adrsandbox.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-600 hover:text-purple-900 hover:underline flex items-center gap-1"
                >
                  changemaker.adrsandbox.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Authentication</h4>
            <p className="text-sm text-gray-600 mb-3">
              RewardSTACK uses JWT authentication with email/password credentials
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Admin Email *</Label>
                <Input
                  id="username"
                  name="username"
                  type="email"
                  placeholder="admin@alldigitalrewards.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Alert className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Username and password are platform-wide settings from environment variables.
                Changes here are used for testing only and will not be persisted.
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" disabled={saving || !programId.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Configuration
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !programId.trim() || !username.trim() || !password.trim()}
            >
              {testing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Test Connection
            </Button>
          </div>
          {(!programId.trim() || !username.trim() || !password.trim()) && (
            <p className="text-sm text-amber-600 mt-2">
              Please fill in Program ID, username, and password to test the connection
            </p>
          )}
        </form>
      </div>

      {/* Test Connection Results */}
      {testResult && testResult.success && (
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            Connection Test Results
          </h3>

          {/* Warning Message */}
          {testResult.warning && (
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                {testResult.warning}
              </AlertDescription>
            </Alert>
          )}

          {/* Program Information */}
          {testResult.program && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Program Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Program Name</label>
                    <p className="text-sm font-medium mt-1">
                      {testResult.program.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Program ID</label>
                    <p className="text-sm font-medium mt-1 font-mono text-xs">
                      {testResult.program.uniqueId}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Status</label>
                    <div className="mt-1 flex gap-2">
                      <Badge
                        className={
                          testResult.program.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {testResult.program.active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge
                        className={
                          testResult.program.published
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {testResult.program.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Organization</label>
                    <p className="text-sm font-medium mt-1">
                      {testResult.program.organization}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Marketplace URL</label>
                    <a
                      href={`https://${testResult.program.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 hover:text-purple-900 hover:underline flex items-center gap-1 mt-1"
                    >
                      {testResult.program.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Program Types</label>
                    <p className="text-sm font-medium mt-1">
                      {testResult.program.programTypes.join(", ") || "None"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Point Value</label>
                    <p className="text-sm font-medium mt-1">
                      1 point = ${testResult.program.pointValue.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Timezone</label>
                    <p className="text-sm font-medium mt-1">
                      {testResult.program.timezone}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Featured Products */}
          {testResult.program && testResult.program.featuredProducts.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  Featured Products
                </CardTitle>
                <CardDescription>
                  {testResult.program.productCount} featured products configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {testResult.program.featuredProducts.map((productId, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="font-mono text-xs"
                    >
                      {productId}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          {testResult.stats && (testResult.stats.participantCount > 0 || testResult.stats.catalogCount > 0) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {testResult.stats.participantCount > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      Participants
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {testResult.stats.participantCount}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Registered in program
                    </p>
                  </CardContent>
                </Card>
              )}

              {testResult.stats.catalogCount > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      Catalog SKUs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {testResult.stats.catalogCount}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Available rewards
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Top SKUs */}
          {testResult.stats && testResult.stats.topSkus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  Top 5 Catalog Items (by value)
                </CardTitle>
                <CardDescription>
                  Highest value rewards available in the catalog
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testResult.stats.topSkus.map((sku, index) => (
                    <div
                      key={sku.skuId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{sku.name}</p>
                          <p className="text-xs text-gray-600 font-mono">
                            SKU: {sku.skuId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">
                          ${(sku.price / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {sku.points.toLocaleString()} pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
