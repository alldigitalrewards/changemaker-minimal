"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceRewardStackSettingsProps {
  workspaceSlug: string;
  initialEnabled: boolean;
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

export function WorkspaceRewardStackSettings({
  workspaceSlug,
  initialEnabled,
}: WorkspaceRewardStackSettingsProps) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingParticipants, setSyncingParticipants] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);

  const handleToggle = async () => {
    setSaving(true);

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/rewardstack/toggle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled: !enabled,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update RewardSTACK status");
      }

      setEnabled(!enabled);
      toast({
        title: !enabled ? "RewardSTACK Enabled" : "RewardSTACK Disabled",
        description: data.message || "Integration status updated successfully",
      });

      // Refresh page to update UI state
      window.location.reload();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update RewardSTACK status";

      toast({
        title: "Update Failed",
        description: errorMessage,
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
        `/api/workspaces/${workspaceSlug}/rewardstack/test-connection`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

  const handleSyncSkus = async () => {
    if (!enabled) {
      toast({
        title: "Integration Not Enabled",
        description: "Please enable RewardSTACK integration first",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/rewardstack/sync-skus`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync SKUs");
      }

      toast({
        title: "SKUs Synced Successfully",
        description: data.message || `Synced ${data.synced} new SKUs and updated ${data.updated} existing SKUs`,
      });

      // Refresh page to show updated SKUs
      window.location.reload();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to sync SKUs";

      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncParticipants = async () => {
    if (!enabled) {
      toast({
        title: "Integration Not Enabled",
        description: "Please enable RewardSTACK integration first",
        variant: "destructive",
      });
      return;
    }

    setSyncingParticipants(true);

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/rewardstack/sync-participants`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync participants");
      }

      toast({
        title: "Participants Synced Successfully",
        description: data.message || `Synced ${data.synced} participants to RewardSTACK`,
      });

      // Show warning if there were failures
      if (data.failed > 0) {
        toast({
          title: "Some Participants Failed",
          description: `${data.failed} participants could not be synced. Check console for details.`,
          variant: "destructive",
        });
        if (data.errors) {
          console.error("Participant sync errors:", data.errors);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to sync participants";

      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSyncingParticipants(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RewardSTACK Integration</CardTitle>
        <CardDescription>
          Manage ADR Marketplace Platform integration for reward fulfillment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="text-base font-medium">
              {enabled ? "Integration Active" : "Integration Disabled"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {enabled
                ? "RewardSTACK integration is currently enabled for this workspace"
                : "Enable RewardSTACK integration to start syncing rewards"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Note: Platform admins configure connection credentials
            </p>
          </div>
          <Button
            type="button"
            variant={enabled ? "destructive" : "default"}
            onClick={handleToggle}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : enabled ? (
              "Disable"
            ) : (
              "Enable"
            )}
          </Button>
        </div>

        {/* Test Connection */}
        {enabled && (
          <div className="border-t pt-4">
            <div className="mb-3">
              <h3 className="font-medium text-sm mb-1">Connection Test</h3>
              <p className="text-sm text-gray-500">
                Verify connection to RewardSTACK using platform credentials
              </p>
            </div>
            <Button
              onClick={handleTestConnection}
              disabled={testing}
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
        )}

        {/* Sync SKUs */}
        {enabled && (
          <div className="border-t pt-4">
            <div className="mb-3">
              <h3 className="font-medium text-sm mb-1">SKU Catalog Management</h3>
              <p className="text-sm text-gray-500">
                Sync all available SKUs from your RewardSTACK program catalog to this workspace.
                This will add new SKUs and update existing ones.
              </p>
            </div>
            <Button
              onClick={handleSyncSkus}
              disabled={syncing}
              variant="outline"
              className="w-full"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing SKUs from RewardSTACK...
                </>
              ) : (
                "Sync SKUs from Program Catalog"
              )}
            </Button>
          </div>
        )}

        {/* Sync Participants */}
        {enabled && (
          <div className="border-t pt-4">
            <div className="mb-3">
              <h3 className="font-medium text-sm mb-1">Participant Management</h3>
              <p className="text-sm text-gray-500">
                Sync all workspace members to RewardSTACK as participants.
                This will create new participants and update existing ones.
              </p>
            </div>
            <Button
              onClick={handleSyncParticipants}
              disabled={syncingParticipants}
              variant="outline"
              className="w-full"
            >
              {syncingParticipants ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Participants to RewardSTACK...
                </>
              ) : (
                "Sync Participants with RewardSTACK"
              )}
            </Button>
          </div>
        )}

        {/* Configuration Notice */}
        {!enabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Contact your platform administrator to configure RewardSTACK credentials.
              Once configured, you can enable the integration here.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
