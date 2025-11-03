# AI Email Template Editor - Implementation Plan

## Overview
Split-view email template editor with AI inline assist for HTML editing and live preview.

## Architecture

### Component Structure
```
EmailTemplateEditor/
├── components/
│   ├── SplitViewEditor.tsx          # Main container with resizable panels
│   ├── HTMLEditor.tsx                # Monaco/CodeMirror editor with syntax highlighting
│   ├── EmailPreview.tsx              # Sandboxed iframe preview
│   ├── AIAssistPanel.tsx             # AI instruction input + controls
│   ├── TemplatePicker.tsx            # Template selection dropdown
│   └── DiffViewer.tsx                # Show AI-suggested changes
├── hooks/
│   ├── useAIEmailAssist.ts           # AI SDK integration hook
│   ├── useEmailPreview.ts            # Preview state management
│   └── useTemplateManager.ts         # Load/save templates
└── actions/
    └── ai-email-assist.ts            # Server action for AI processing
```

## Technical Stack

### Dependencies
```json
{
  "dependencies": {
    "ai": "^3.4.0",                    // Vercel AI SDK
    "@ai-sdk/anthropic": "^0.1.0",     // Claude integration
    "@monaco-editor/react": "^4.6.0",  // Code editor
    "react-resizable-panels": "^2.0.0", // Split view
    "juice": "^10.0.0",                // Inline CSS for email
    "html-react-parser": "^5.1.0"      // Safe HTML parsing
  }
}
```

### AI Gateway Configuration
```typescript
// lib/ai/config.ts
import { anthropic } from '@ai-sdk/anthropic';

export const aiConfig = {
  // Use AI Gateway for monitoring/caching
  baseURL: process.env.AI_GATEWAY_URL || 'https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/anthropic',

  // Model configuration
  model: anthropic('claude-3-5-sonnet-20241022'),

  // Rate limiting
  maxTokens: 4000,
  temperature: 0.7,
};
```

## Implementation Details

### 1. Main Editor Component

```typescript
// app/w/[slug]/admin/settings/email/components/SplitViewEditor.tsx
'use client';

import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { HTMLEditor } from './HTMLEditor';
import { EmailPreview } from './EmailPreview';
import { AIAssistPanel } from './AIAssistPanel';
import { useAIEmailAssist } from '../hooks/useAIEmailAssist';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables?: string[];
}

export function SplitViewEditor({
  template,
  onSave
}: {
  template: EmailTemplate;
  onSave: (html: string) => Promise<void>;
}) {
  const [html, setHtml] = useState(template.html);
  const [selectedText, setSelectedText] = useState('');

  const {
    isProcessing,
    suggestedHtml,
    applyAIEdit,
    rejectEdit,
    hasActiveSuggestion
  } = useAIEmailAssist();

  return (
    <div className="flex flex-col h-full">
      {/* AI Assist Panel */}
      <AIAssistPanel
        currentHtml={html}
        selectedText={selectedText}
        onApplyEdit={applyAIEdit}
        disabled={isProcessing}
      />

      {/* Split View */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left: HTML Editor */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <HTMLEditor
            value={html}
            onChange={setHtml}
            onSelectionChange={setSelectedText}
            suggestedHtml={suggestedHtml}
            hasActiveSuggestion={hasActiveSuggestion}
            onAcceptSuggestion={() => {
              if (suggestedHtml) {
                setHtml(suggestedHtml);
                rejectEdit(); // Clear suggestion
              }
            }}
            onRejectSuggestion={rejectEdit}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Live Preview */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <EmailPreview
            html={suggestedHtml || html}
            subject={template.subject}
            variables={template.variables}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```

### 2. AI Assist Hook

```typescript
// hooks/useAIEmailAssist.ts
'use client';

import { useState } from 'react';
import { useCompletion } from 'ai/react';

export function useAIEmailAssist() {
  const [suggestedHtml, setSuggestedHtml] = useState<string | null>(null);

  const { complete, isLoading } = useCompletion({
    api: '/api/ai/email-assist',
    onFinish: (prompt, completion) => {
      // Extract HTML from AI response
      const htmlMatch = completion.match(/```html\n([\s\S]*?)\n```/);
      if (htmlMatch) {
        setSuggestedHtml(htmlMatch[1]);
      }
    },
  });

  const applyAIEdit = async (instruction: string, currentHtml: string, selectedText?: string) => {
    const prompt = buildPrompt(instruction, currentHtml, selectedText);
    await complete(prompt);
  };

  const rejectEdit = () => {
    setSuggestedHtml(null);
  };

  return {
    isProcessing: isLoading,
    suggestedHtml,
    applyAIEdit,
    rejectEdit,
    hasActiveSuggestion: !!suggestedHtml,
  };
}

function buildPrompt(instruction: string, currentHtml: string, selectedText?: string): string {
  const context = selectedText
    ? `The user has selected this portion:\n\n${selectedText}\n\n`
    : '';

  return `You are an expert email template developer. Modify the HTML email template based on the user's instruction.

${context}Current HTML:
\`\`\`html
${currentHtml}
\`\`\`

User instruction: ${instruction}

Requirements:
- Maintain email-safe HTML/CSS (inline styles, tables for layout)
- Preserve existing template variables ({{variable_name}})
- Use web-safe fonts and colors
- Ensure mobile responsiveness
- Return ONLY the complete modified HTML wrapped in \`\`\`html code blocks

Modified HTML:`;
}
```

### 3. AI API Route (Server Action)

```typescript
// app/api/ai/email-assist/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth';

export async function POST(req: Request) {
  const { user, workspace } = await requireWorkspaceAdmin(req);

  const { prompt } = await req.json();

  // Use AI Gateway if configured
  const baseURL = process.env.AI_GATEWAY_URL;

  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022', { baseURL }),
    prompt,
    maxTokens: 4000,
    temperature: 0.7,
  });

  return result.toDataStreamResponse();
}
```

### 4. HTML Editor with Diff View

```typescript
// components/HTMLEditor.tsx
'use client';

import { Editor } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface HTMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (text: string) => void;
  suggestedHtml?: string | null;
  hasActiveSuggestion?: boolean;
  onAcceptSuggestion?: () => void;
  onRejectSuggestion?: () => void;
}

export function HTMLEditor({
  value,
  onChange,
  onSelectionChange,
  suggestedHtml,
  hasActiveSuggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
}: HTMLEditorProps) {
  return (
    <div className="relative h-full">
      {/* Accept/Reject Controls */}
      {hasActiveSuggestion && (
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <Button
            size="sm"
            onClick={onAcceptSuggestion}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRejectSuggestion}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      )}

      {/* Monaco Editor */}
      <Editor
        height="100%"
        language="html"
        value={suggestedHtml || value}
        onChange={(val) => onChange(val || '')}
        onMount={(editor) => {
          // Track text selection
          editor.onDidChangeCursorSelection((e) => {
            const selection = editor.getModel()?.getValueInRange(e.selection);
            if (selection && onSelectionChange) {
              onSelectionChange(selection);
            }
          });
        }}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          lineNumbers: 'on',
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
```

### 5. Email Preview Component

```typescript
// components/EmailPreview.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone } from 'lucide-react';

interface EmailPreviewProps {
  html: string;
  subject: string;
  variables?: string[];
}

export function EmailPreview({ html, subject, variables = [] }: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [processedHtml, setProcessedHtml] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Replace template variables with sample data
    let processed = html;
    variables.forEach((variable) => {
      const sampleValue = getSampleValue(variable);
      processed = processed.replace(
        new RegExp(`{{${variable}}}`, 'g'),
        sampleValue
      );
    });

    // Inline CSS for email compatibility
    inlineStyles(processed).then(setProcessedHtml);
  }, [html, variables]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Preview</CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === 'desktop' ? 'default' : 'outline'}
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'mobile' ? 'default' : 'outline'}
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="h-full flex flex-col items-center justify-start p-4 bg-gray-50">
          {/* Email Subject */}
          <div className="w-full max-w-2xl mb-2 p-2 bg-white border rounded">
            <p className="text-sm text-gray-600">Subject:</p>
            <p className="font-medium">{subject}</p>
          </div>

          {/* Email Body Preview */}
          <iframe
            ref={iframeRef}
            srcDoc={getIframeContent(processedHtml)}
            className={`bg-white border rounded shadow-sm ${
              viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl'
            }`}
            style={{ height: '600px' }}
            sandbox="allow-same-origin"
            title="Email Preview"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Helper: Inline CSS for email compatibility
async function inlineStyles(html: string): Promise<string> {
  try {
    const juice = (await import('juice')).default;
    return juice(html);
  } catch {
    return html;
  }
}

// Helper: Get sample data for template variables
function getSampleValue(variable: string): string {
  const samples: Record<string, string> = {
    user_name: 'John Doe',
    challenge_name: 'Innovation Challenge 2024',
    workspace_name: 'Acme Corporation',
    enrollment_date: new Date().toLocaleDateString(),
    challenge_url: 'https://changemaker.im/w/acme/challenges/123',
  };
  return samples[variable] || `{{${variable}}}`;
}

// Helper: Create sandboxed iframe content
function getIframeContent(html: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}
```

### 6. AI Assist Panel

```typescript
// components/AIAssistPanel.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIAssistPanelProps {
  currentHtml: string;
  selectedText?: string;
  onApplyEdit: (instruction: string, html: string, selectedText?: string) => Promise<void>;
  disabled?: boolean;
}

export function AIAssistPanel({
  currentHtml,
  selectedText,
  onApplyEdit,
  disabled,
}: AIAssistPanelProps) {
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApply = async () => {
    if (!instruction.trim()) return;

    setIsProcessing(true);
    try {
      await onApplyEdit(instruction, currentHtml, selectedText);
      setInstruction(''); // Clear after successful apply
    } finally {
      setIsProcessing(false);
    }
  };

  const quickPrompts = [
    'Make the header more prominent',
    'Add a call-to-action button',
    'Improve mobile responsiveness',
    'Use brand colors',
    'Add social media links in footer',
  ];

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-coral-500" />
            AI Assist
            {selectedText && (
              <span className="text-xs text-gray-500">
                (Editing selected text)
              </span>
            )}
          </label>

          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Describe how you want to modify the email template..."
            className="min-h-[80px] mb-2"
            disabled={disabled || isProcessing}
          />

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2 mb-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                size="sm"
                variant="outline"
                onClick={() => setInstruction(prompt)}
                disabled={disabled || isProcessing}
                className="text-xs"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleApply}
          disabled={!instruction.trim() || disabled || isProcessing}
          className="bg-coral-500 hover:bg-coral-600"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Apply AI Edit
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
```

## Database Schema

```prisma
// Add to prisma/schema.prisma
model EmailTemplate {
  id          String   @id @default(uuid()) @db.Uuid
  workspaceId String   @db.Uuid
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  name        String
  subject     String
  html        String   @db.Text
  variables   String[] // Template variable names

  // Built-in templates vs custom
  isBuiltIn   Boolean  @default(false)

  // Usage tracking
  lastUsedAt  DateTime?
  usageCount  Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([workspaceId])
}
```

## API Routes

### Save Template
```typescript
// app/api/workspaces/[slug]/email-templates/route.ts
import { NextRequest } from 'next/server';
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { workspace } = await requireWorkspaceAdmin(req, params.slug);

  const { name, subject, html, variables } = await req.json();

  const template = await prisma.emailTemplate.create({
    data: {
      workspaceId: workspace.id,
      name,
      subject,
      html,
      variables: variables || [],
    },
  });

  return Response.json({ template });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { workspace } = await requireWorkspaceAdmin(req, params.slug);

  const templates = await prisma.emailTemplate.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json({ templates });
}
```

## Cost & Performance Optimization

### 1. AI Gateway Configuration
```typescript
// Use Cloudflare AI Gateway or Vercel AI Gateway
const AI_GATEWAY_CONFIG = {
  // Cache identical prompts for 1 hour
  cache: {
    ttl: 3600,
    namespace: 'email-templates',
  },

  // Rate limiting per workspace
  rateLimit: {
    requestsPerMinute: 10,
    tokensPerMinute: 50000,
  },

  // Cost tracking
  logging: {
    enabled: true,
    includePrompts: false,
    includeCompletions: true,
  },
};
```

### 2. Debouncing & Caching
```typescript
// hooks/useAIEmailAssist.ts - Add debouncing
import { useDebouncedCallback } from 'use-debounce';

export function useAIEmailAssist() {
  const debouncedApply = useDebouncedCallback(
    (instruction: string, html: string, selectedText?: string) => {
      return complete(buildPrompt(instruction, html, selectedText));
    },
    500 // Wait 500ms after user stops typing
  );

  // ... rest of hook
}
```

## Advanced Features (Phase 2)

### 1. Version History
```typescript
model EmailTemplateVersion {
  id         String   @id @default(uuid()) @db.Uuid
  templateId String   @db.Uuid
  template   EmailTemplate @relation(fields: [templateId], references: [id])

  html       String   @db.Text
  createdBy  String   @db.Uuid
  createdAt  DateTime @default(now())

  @@index([templateId, createdAt])
}
```

### 2. AI Suggestions on Load
```typescript
// Proactive AI suggestions when template is opened
const { suggestions } = useAISuggestions(template.html);

// Show suggestions panel
<SuggestionsPanel
  suggestions={[
    'Add mobile-responsive table layout',
    'Include unsubscribe link',
    'Improve heading hierarchy',
  ]}
  onApply={(suggestion) => applyAIEdit(suggestion, html)}
/>
```

### 3. Template Variables Auto-Detection
```typescript
// Extract template variables from HTML
function extractVariables(html: string): string[] {
  const matches = html.matchAll(/{{([a-zA-Z_][a-zA-Z0-9_]*)}}/g);
  return [...new Set([...matches].map(m => m[1]))];
}
```

## Testing Strategy

### Unit Tests
```typescript
// __tests__/ai-email-assist.test.ts
describe('AI Email Assist', () => {
  it('should build correct prompt with selection', () => {
    const prompt = buildPrompt(
      'Make this bold',
      '<p>Hello</p>',
      'Hello'
    );
    expect(prompt).toContain('selected this portion');
  });

  it('should extract HTML from AI response', () => {
    const response = '```html\n<p>Modified</p>\n```';
    const html = extractHtml(response);
    expect(html).toBe('<p>Modified</p>');
  });
});
```

### Integration Tests
```typescript
// __tests__/email-editor.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { SplitViewEditor } from '../components/SplitViewEditor';

describe('Email Editor', () => {
  it('should apply AI suggestion when accepted', async () => {
    const onSave = jest.fn();

    render(
      <SplitViewEditor
        template={mockTemplate}
        onSave={onSave}
      />
    );

    // Trigger AI edit
    const input = screen.getByPlaceholderText(/Describe how you want/);
    await userEvent.type(input, 'Add a header');
    await userEvent.click(screen.getByText('Apply AI Edit'));

    // Wait for suggestion
    await waitFor(() => {
      expect(screen.getByText('Accept')).toBeInTheDocument();
    });

    // Accept suggestion
    await userEvent.click(screen.getByText('Accept'));

    // Verify HTML updated
    expect(screen.getByRole('textbox')).toHaveValue(expect.stringContaining('<header>'));
  });
});
```

## Security Considerations

1. **Input Sanitization**: Sanitize user instructions before sending to AI
2. **Output Validation**: Validate AI-generated HTML to prevent XSS
3. **Rate Limiting**: Limit AI requests per workspace/user
4. **Sandboxing**: Preview email in sandboxed iframe
5. **RBAC**: Only workspace admins can edit email templates

## Next Steps

1. **Phase 1 (MVP)**:
   - Implement split-view editor with Monaco
   - Add basic AI assist (single instruction → full HTML replacement)
   - Email preview with desktop/mobile toggle
   - Save/load templates

2. **Phase 2 (Enhanced)**:
   - Diff view for AI suggestions
   - Version history
   - Template variable management
   - Batch edit multiple templates

3. **Phase 3 (Advanced)**:
   - A/B testing email templates
   - Analytics integration (open rates, click rates)
   - AI-powered subject line generation
   - Personalization recommendations

---

This implementation provides a production-ready foundation for AI-assisted email template editing with all the features discussed in the meeting.
