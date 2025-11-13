"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Crown, AlertTriangle } from "lucide-react";

interface WorkspaceOwnershipTransferDialogProps {
  workspaceId: string;
  workspaceName: string;
  currentOwnerId: string;
  admins: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
    };
  }>;
  onTransfer: (fromUserId: string, toUserId: string) => Promise<void>;
}

export function WorkspaceOwnershipTransferDialog({
  workspaceId,
  workspaceName,
  currentOwnerId,
  admins,
  onTransfer,
}: WorkspaceOwnershipTransferDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out current owner from the list
  const eligibleAdmins = admins.filter((admin) => admin.userId !== currentOwnerId);

  const handleTransfer = async () => {
    if (!selectedAdminUserId) {
      setError("Please select an admin to transfer ownership to");
      return;
    }

    setIsTransferring(true);
    setError(null);

    try {
      await onTransfer(currentOwnerId, selectedAdminUserId);
      setIsOpen(false);
      setSelectedAdminUserId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer ownership");
    } finally {
      setIsTransferring(false);
    }
  };

  const getDisplayName = (admin: typeof eligibleAdmins[0]) => {
    const user = admin.user;
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.email;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Crown className="h-4 w-4" />
          Transfer Ownership
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Transfer Workspace Ownership
          </DialogTitle>
          <DialogDescription>
            Transfer ownership of <span className="font-semibold">{workspaceName}</span> to another admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              <strong>Warning:</strong> Transferring ownership will remove your owner privileges. The new owner will have
              full control over workspace settings, deletion, and ownership transfers.
            </AlertDescription>
          </Alert>

          {eligibleAdmins.length === 0 ? (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-800">
                No other admins available. You must invite another user as an admin before you can transfer ownership.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="admin-select">Select New Owner</Label>
              <Select value={selectedAdminUserId} onValueChange={setSelectedAdminUserId}>
                <SelectTrigger id="admin-select">
                  <SelectValue placeholder="Choose an admin..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleAdmins.map((admin) => (
                    <SelectItem key={admin.userId} value={admin.userId}>
                      <div className="flex flex-col">
                        <span className="font-medium">{getDisplayName(admin)}</span>
                        <span className="text-xs text-gray-500">{admin.user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-800">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isTransferring}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedAdminUserId || isTransferring || eligibleAdmins.length === 0}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isTransferring ? "Transferring..." : "Transfer Ownership"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
