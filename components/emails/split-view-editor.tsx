'use client';

import { useState } from 'react';
import { MonacoEditor } from './monaco-editor';
import { EmailPreview } from './email-preview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Code, Eye } from 'lucide-react';

interface SplitViewEditorProps {
  value: string;
  onChange: (value: string) => void;
  workspaceSlug: string;
  templateType: string;
  workspaceName?: string;
  brandColor?: string;
  subject?: string;
}

export function SplitViewEditor({
  value,
  onChange,
  workspaceSlug,
  templateType,
  workspaceName,
  brandColor,
  subject,
}: SplitViewEditorProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  if (typeof window !== 'undefined') {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Check on mount and window resize
    if (!isMobile && window.innerWidth < 1024) {
      checkMobile();
    }

    if (typeof window !== 'undefined' && !window.__resizeListenerAdded) {
      window.addEventListener('resize', checkMobile);
      window.__resizeListenerAdded = true;
    }
  }

  // Mobile: Use tabs for editor/preview
  if (isMobile) {
    return (
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="editor">
            <Code className="h-4 w-4 mr-2" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="editor" className="mt-4">
          <MonacoEditor
            value={value}
            onChange={onChange}
            workspaceSlug={workspaceSlug}
            templateType={templateType}
            workspaceName={workspaceName}
            brandColor={brandColor}
            height="600px"
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-4">
          <EmailPreview
            html={value}
            subject={subject}
            workspaceName={workspaceName}
            workspaceSlug={workspaceSlug}
            templateType={templateType}
          />
        </TabsContent>
      </Tabs>
    );
  }

  // Desktop: Use resizable split view
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-[600px] rounded-lg border"
    >
      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full p-4 overflow-auto">
          <MonacoEditor
            value={value}
            onChange={onChange}
            workspaceSlug={workspaceSlug}
            templateType={templateType}
            workspaceName={workspaceName}
            brandColor={brandColor}
            height="550px"
          />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full p-4 overflow-auto">
          <EmailPreview
            html={value}
            subject={subject}
            workspaceName={workspaceName}
            workspaceSlug={workspaceSlug}
            templateType={templateType}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __resizeListenerAdded?: boolean;
  }
}
