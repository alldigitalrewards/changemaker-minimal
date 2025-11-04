"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RewardStackConfigProps {
  workspaceId: string;
  workspaceSlug: string;
  initialConfig?: {
    rewardStackEnabled: boolean;
    rewardStackEnvironment: "QA" | "PRODUCTION" | null;
    rewardStackOrgId: string | null;
    rewardStackProgramId: string | null;
    rewardStackSandboxMode: boolean;
  };
}

interface TestConnectionResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  program?: {
    id: string;
    name: string;
  };
}

export function RewardStackConfig({
  workspaceSlug,
  initialConfig,
}: RewardStackConfigProps) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(
    null
  );

  // Form state
  const [enabled, setEnabled] = useState(initialConfig?.rewardStackEnabled || false);
  const [programId, setProgramId] = useState(
    initialConfig?.rewardStackProgramId || ""
  );
  const [orgId, setOrgId] = useState(initialConfig?.rewardStackOrgId || "");
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<"QA" | "PRODUCTION">(
    initialConfig?.rewardStackEnvironment || "QA"
  );
  const [sandboxMode, setSandboxMode] = useState(
    initialConfig?.rewardStackSandboxMode ?? true
  );

  const handleTestConnection = async () => {
    // Validate required fields
    if (!programId || !apiKey) {
      toast({
        title: "Validation Error",
        description: "Please fill in Program ID and API Key",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/rewardstack/test-connection`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            programId,
            apiKey,
            environment,
          }),
        }
      );

      const data: TestConnectionResponse = await response.json();
      setTestResult(data);

      if (data.success) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${data.program?.name || "RewardSTACK"}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to RewardSTACK",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Network error";
      setTestResult({
        success: false,
        error: "Network error",
        details: errorMessage,
      });

      toast({
        title: "Connection Error",
        description: "Failed to test connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfiguration = async () => {
    // Validate required fields if enabling
    if (enabled && (!programId || !apiKey)) {
      toast({
        title: "Validation Error",
        description: "Please fill in Program ID and API Key to enable RewardSTACK",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/rewardstack/config`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled,
            environment,
            orgId: orgId || undefined,
            programId,
            apiKey,
            sandboxMode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }

      toast({
        title: "Configuration Saved",
        description: data.message || "RewardSTACK configuration updated successfully",
      });

      // Refresh page to show updated state
      window.location.reload();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save configuration";

      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RewardSTACK Integration</CardTitle>
        <CardDescription>
          Configure ADR Marketplace Platform API integration for reward
          fulfillment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="enabled" className="text-base font-medium">
              Enable RewardSTACK Integration
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              {enabled
                ? "RewardSTACK integration is active"
                : "Enable to start syncing rewards"}
            </p>
          </div>
          <Button
            type="button"
            variant={enabled ? "destructive" : "default"}
            onClick={() => setEnabled(!enabled)}
          >
            {enabled ? "Disable" : "Enable"}
          </Button>
        </div>

        {/* Configuration Form */}
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="environment">Environment</Label>
            <Select
              value={environment}
              onValueChange={(value: "QA" | "PRODUCTION") =>
                setEnvironment(value)
              }
            >
              <SelectTrigger id="environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="QA">QA (Testing)</SelectItem>
                <SelectItem value="PRODUCTION">Production</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              {environment === "QA"
                ? "QA environment: https://admin.adrqa.info/api"
                : "Production environment: https://admin.adr.info/api"}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="orgId">Organization ID (Optional)</Label>
            <Input
              id="orgId"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="Enter your RewardSTACK Organization ID"
            />
            <p className="text-sm text-gray-500">
              Your RewardSTACK organization identifier (if applicable)
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="programId">
              Program ID{enabled && <span className="text-red-500"> *</span>}
            </Label>
            <Input
              id="programId"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              placeholder="Enter your RewardSTACK Program ID"
              required={enabled}
            />
            <p className="text-sm text-gray-500">
              Your RewardSTACK program identifier
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apiKey">
              API Key{enabled && <span className="text-red-500"> *</span>}
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              required
            />
            <p className="text-sm text-gray-500">
              Keep this secure - it will be encrypted when saved
            </p>
          </div>

          {/* Test Connection Button */}
          <Button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !programId || !apiKey}
            variant="outline"
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>

          {/* Test Result Display */}
          {testResult && (
            <Alert
              variant={testResult.success ? "default" : "destructive"}
              className="mt-4"
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {testResult.success ? (
                  <div>
                    <p className="font-medium">Connection Successful!</p>
                    {testResult.program && (
                      <p className="text-sm mt-1">
                        Connected to: {testResult.program.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">
                      {testResult.error || "Connection Failed"}
                    </p>
                    {testResult.details && (
                      <p className="text-sm mt-1">{testResult.details}</p>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Save Configuration */}
        <div className="border-t pt-4">
          {enabled && (!testResult || !testResult.success) && (
            <p className="text-sm text-amber-600 mb-2">
              ⚠️ Recommended: Test connection before saving configuration
            </p>
          )}
          <Button
            onClick={handleSaveConfiguration}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Configuration...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
