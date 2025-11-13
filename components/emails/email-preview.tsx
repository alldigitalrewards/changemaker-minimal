'use client';

import { useMemo, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import parse from 'html-react-parser';
import { Monitor, Smartphone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSampleData, replaceVariables } from '@/lib/email/template-variables';

interface EmailPreviewProps {
  html: string;
  subject?: string;
  workspaceName?: string;
  workspaceSlug?: string;
  templateType?: string;
}

type ViewMode = 'desktop' | 'mobile';

export function EmailPreview({ html, subject, workspaceName, workspaceSlug, templateType }: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');

  // Generate sample data with workspace context
  const sampleData = useMemo(() => {
    const appUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return getSampleData({
      workspaceName: workspaceName || 'Your Workspace',
      workspaceUrl: workspaceSlug ? `${appUrl}/w/${workspaceSlug}` : `${appUrl}/w/demo`,
      actionUrl: workspaceSlug ? `${appUrl}/w/${workspaceSlug}` : `${appUrl}/w/demo`,
      inviteUrl: workspaceSlug ? `${appUrl}/w/${workspaceSlug}/invites/sample` : `${appUrl}/w/demo/invites/sample`,
      challengeUrl: workspaceSlug ? `${appUrl}/w/${workspaceSlug}/challenges/sample` : `${appUrl}/w/demo/challenges/sample`,
    });
  }, [workspaceName, workspaceSlug]);

  // Replace variables BEFORE sanitizing HTML to prevent XSS
  const sanitizedHtml = useMemo(() => {
    if (!html) return '';

    // CRITICAL: Replace variables first, then sanitize
    const withVariables = replaceVariables(html, sampleData);

    return DOMPurify.sanitize(withVariables, {
      ADD_TAGS: ['style'],
      ADD_ATTR: ['target', 'style', 'class', 'id'],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }, [html, sampleData]);

  // Parse sanitized HTML into React elements
  const parsedHtml = useMemo(() => {
    if (!sanitizedHtml) return null;
    return parse(sanitizedHtml);
  }, [sanitizedHtml]);

  // Replace variables in subject line
  const displaySubject = useMemo(() => {
    if (!subject) return undefined;
    return replaceVariables(subject, sampleData);
  }, [subject, sampleData]);

  if (!html) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 bg-muted/30 rounded-lg border-2 border-dashed">
        <Mail className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Enter HTML in the editor or use AI Assist to generate a template to see
          the preview here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Preview</span>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-4 w-4 mr-1" />
            Desktop
          </Button>
          <Button
            variant={viewMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4 mr-1" />
            Mobile
          </Button>
        </div>
      </div>

      {/* Subject Line */}
      {displaySubject && (
        <div className="border-b pb-2">
          <p className="text-sm text-muted-foreground">Subject:</p>
          <p className="font-medium">{displaySubject}</p>
        </div>
      )}

      {/* Email Preview */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div
          className={`mx-auto transition-all duration-300 ${
            viewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
          }`}
        >
          <div className="email-preview-content">{parsedHtml}</div>
        </div>
      </div>

      {/* Preview Info */}
      <p className="text-xs text-muted-foreground">
        Preview is sanitized for security. Variables like{' '}
        <code className="px-1 py-0.5 bg-muted rounded">
          {'{{recipientName}}'}
        </code>{' '}
        will be replaced with actual values when sent.
      </p>
    </div>
  );
}
