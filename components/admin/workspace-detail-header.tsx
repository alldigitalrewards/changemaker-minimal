"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Settings } from "lucide-react";
import { WorkspaceEditDialog } from "./workspace-edit-dialog";

interface WorkspaceDetailHeaderProps {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
}

export function WorkspaceDetailHeader({
  workspaceId,
  workspaceName,
  workspaceSlug,
}: WorkspaceDetailHeaderProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" asChild>
          <Link href={`/w/${workspaceSlug}/admin/dashboard`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View as Admin
          </Link>
        </Button>
        <Button onClick={() => setEditDialogOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Edit Workspace
        </Button>
      </div>

      <WorkspaceEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        workspaceSlug={workspaceSlug}
      />
    </>
  );
}
