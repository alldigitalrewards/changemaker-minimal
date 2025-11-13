"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Trash2, Award, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface WorkspaceSku {
  id: string;
  skuId: string;
  name: string;
  description: string | null;
  value: number | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  User: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface WorkspaceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  onSuccess?: () => void;
}

// Available SKUs for QA testing (from ADR Marketplace)
// Currently testing with: CVSEC100, CPEC50, APPLEWTCH
const AVAILABLE_SKUS = [
  {
    skuId: "CVSEC100",
    name: "CVS $100 eGift Card",
    description: "CVS Pharmacy electronic gift card worth $100",
    value: 10000,
  },
  {
    skuId: "CPEC50",
    name: "CPE $50 eGift Card",
    description: "Custom promotional electronic gift card worth $50",
    value: 5000,
  },
  {
    skuId: "APPLEWTCH",
    name: "Apple Watch",
    description: "Apple Watch Series 9",
    value: 40000,
  },
];

export function WorkspaceEditDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  workspaceSlug,
  onSuccess,
}: WorkspaceEditDialogProps) {
  const [activeTab, setActiveTab] = useState("skus");
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<WorkspaceSku[]>([]);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [addingSkuId, setAddingSkuId] = useState<string | null>(null);
  const [deletingSkuId, setDeletingSkuId] = useState<string | null>(null);

  // Fetch workspace SKUs when dialog opens
  useEffect(() => {
    if (open) {
      fetchSkus();
    }
  }, [open, workspaceId]);

  async function fetchSkus() {
    setLoadingSkus(true);
    try {
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/skus`);
      if (!response.ok) throw new Error("Failed to fetch SKUs");
      const data = await response.json();
      setSkus(data.skus);
    } catch (error) {
      console.error("Error fetching SKUs:", error);
      toast.error("Failed to load workspace SKUs");
    } finally {
      setLoadingSkus(false);
    }
  }

  async function addSku(skuData: typeof AVAILABLE_SKUS[0]) {
    setAddingSkuId(skuData.skuId);
    try {
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/skus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skuData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add SKU");
      }

      const data = await response.json();
      setSkus([...skus, data.sku]);
      toast.success(`Added ${skuData.name} to workspace`);
    } catch (error: any) {
      console.error("Error adding SKU:", error);
      toast.error(error.message || "Failed to add SKU");
    } finally {
      setAddingSkuId(null);
    }
  }

  async function removeSku(skuRecordId: string, skuName: string) {
    setDeletingSkuId(skuRecordId);
    try {
      const response = await fetch(
        `/api/admin/workspaces/${workspaceId}/skus/${skuRecordId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to remove SKU");

      setSkus(skus.filter((s) => s.id !== skuRecordId));
      toast.success(`Removed ${skuName} from workspace`);
    } catch (error) {
      console.error("Error removing SKU:", error);
      toast.error("Failed to remove SKU");
    } finally {
      setDeletingSkuId(null);
    }
  }

  async function toggleSkuActive(skuRecordId: string, currentStatus: boolean) {
    try {
      const response = await fetch(
        `/api/admin/workspaces/${workspaceId}/skus/${skuRecordId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !currentStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to update SKU");

      const data = await response.json();
      setSkus(skus.map((s) => (s.id === skuRecordId ? data.sku : s)));
      toast.success(`SKU ${currentStatus ? "deactivated" : "activated"}`);
    } catch (error) {
      console.error("Error updating SKU:", error);
      toast.error("Failed to update SKU status");
    }
  }

  const assignedSkuIds = new Set(skus.map((s) => s.skuId));
  const availableSkusToAdd = AVAILABLE_SKUS.filter((s) => !assignedSkuIds.has(s.skuId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Workspace: {workspaceName}</DialogTitle>
          <DialogDescription>
            Manage workspace configuration and assigned SKUs
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="skus">SKU Management</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="skus" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assigned SKUs</CardTitle>
                <CardDescription>
                  SKUs available to workspace administrators for reward issuance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSkus ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : skus.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No SKUs assigned to this workspace yet. Add SKUs below to enable reward issuance.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {skus.map((sku) => (
                      <div
                        key={sku.id}
                        className="flex items-start justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{sku.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {sku.skuId}
                            </Badge>
                            {sku.isDefault && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                Default
                              </Badge>
                            )}
                            {sku.isActive ? (
                              <Badge className="bg-green-100 text-green-800 text-xs flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 text-xs flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                          {sku.description && (
                            <p className="text-sm text-gray-600 mb-1">{sku.description}</p>
                          )}
                          {sku.value && (
                            <p className="text-xs text-gray-500">
                              Point value: {sku.value.toLocaleString()} points
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSkuActive(sku.id, sku.isActive)}
                          >
                            {sku.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          {!sku.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSku(sku.id, sku.name)}
                              disabled={deletingSkuId === sku.id}
                            >
                              {deletingSkuId === sku.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-600" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add SKUs</CardTitle>
                <CardDescription>
                  Select from available SKUs to add to this workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availableSkusToAdd.length === 0 ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      All available SKUs have been assigned to this workspace
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {availableSkusToAdd.map((sku) => (
                      <div
                        key={sku.skuId}
                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">{sku.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {sku.skuId}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{sku.description}</p>
                          <p className="text-xs text-gray-500">
                            Point value: {sku.value.toLocaleString()} points
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addSku(sku)}
                          disabled={addingSkuId === sku.skuId}
                        >
                          {addingSkuId === sku.skuId ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Add to Workspace
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Settings</CardTitle>
                <CardDescription>
                  Basic workspace configuration (read-only for now)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Workspace Name</Label>
                  <Input value={workspaceName} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Workspace Slug</Label>
                  <Input value={workspaceSlug} disabled className="mt-1" />
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Workspace name and slug editing will be available in a future update
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
