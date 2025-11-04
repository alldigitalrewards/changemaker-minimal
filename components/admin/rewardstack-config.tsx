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
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(
    null
  );

  // Form state
  const [programId, setProgramId] = useState(
    initialConfig?.rewardStackProgramId || ""
  );
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<"QA" | "PRODUCTION">(
    initialConfig?.rewardStackEnvironment || "QA"
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
            <Label htmlFor="programId">Program ID</Label>
            <Input
              id="programId"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              placeholder="Enter your RewardSTACK Program ID"
              required
            />
            <p className="text-sm text-gray-500">
              Your RewardSTACK program identifier
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
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

        {/* Coming Soon: Save Configuration */}
        <div className="border-t pt-4">
          <p className="text-sm text-gray-500 mb-2">
            Next: Save configuration and enable integration (Task 46)
          </p>
          <Button disabled className="w-full">
            Save Configuration (Coming Soon)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
