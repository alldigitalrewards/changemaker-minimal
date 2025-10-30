# AI Email Template Editor Implementation Roadmap

## Overview

Split-view email template editor with AI inline assist for HTML editing and live preview, leveraging Vercel AI SDK and AI Gateway for intelligent email template creation and modification.

**Current Status**: Planning Complete | Ready for Implementation

**Phase Completion**:
- 📋 **Phase 1 (Foundation)**: PLANNED - Core infrastructure and component architecture
- 📋 **Phase 2 (AI Integration)**: PLANNED - AI SDK integration and inline assist
- 📋 **Phase 3 (Advanced Features)**: PLANNED - Diff view, version history, template management
- 📋 **Phase 4 (Production)**: PLANNED - Testing, optimization, deployment

**Key Requirements**:
- Split-view editor (HTML left, Preview right)
- AI inline assist for template modifications
- Live preview with desktop/mobile toggle
- Template variable support (`{{variable_name}}`)
- Email-safe HTML generation (inline styles, table layouts)
- Workspace-isolated template management

**Technical Stack**:
- Vercel AI SDK v3.4+ with streaming responses
- Claude 3.5 Sonnet via Anthropic SDK
- Monaco Editor for code editing
- React Resizable Panels for split layout
- Juice for CSS inlining (email compatibility)
- Supabase/Prisma for template storage

---

## Phase 1: Foundation & Core UI (Week 1) - 12 Tasks

### Database Schema

**Task 1: Email Template Schema Design (2 hours)**

- Add EmailTemplate model to prisma/schema.prisma:
  ```prisma
  model EmailTemplate {
    id          String   @id @default(uuid()) @db.Uuid
    workspaceId String   @db.Uuid
    workspace   Workspace @relation(fields: [workspaceId], references: [id])

    name        String
    subject     String
    html        String   @db.Text
    variables   String[] // Template variable names

    isBuiltIn   Boolean  @default(false)

    lastUsedAt  DateTime?
    usageCount  Int      @default(0)

    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    @@index([workspaceId])
    @@index([workspaceId, isBuiltIn])
  }
  ```
- Define template variable schema
- Add workspace relation
- Include usage tracking fields
- **File**: prisma/schema.prisma
- **Dependencies**: None
- **Deliverable**: EmailTemplate model in schema
- **Risk**: Migration conflicts with existing schema

**Task 2: Database Migration (30 minutes)**

- Generate migration: `pnpm prisma migrate dev --name add_email_templates`
- Test migration on local clone
- Verify indexes created correctly
- **File**: prisma/migrations/*/migration.sql
- **Dependencies**: Task 1
- **Deliverable**: Migration file
- **Risk**: Schema conflicts

### Dependencies & Configuration

**Task 3: AI SDK Installation (1 hour)**

- Install dependencies:
  ```bash
  pnpm add ai @ai-sdk/anthropic
  pnpm add -D @monaco-editor/react react-resizable-panels juice html-react-parser
  ```
- Configure AI Gateway in environment:
  ```env
  AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/anthropic
  ANTHROPIC_API_KEY=sk-ant-...
  ```
- Create lib/ai/config.ts with model configuration
- Test AI SDK connection with simple completion
- **Files**: package.json, .env.local, lib/ai/config.ts
- **Dependencies**: None
- **Deliverable**: Working AI SDK setup
- **Risk**: AI Gateway configuration issues

**Task 4: AI Configuration & Rate Limiting (2 hours)**

- Create lib/ai/config.ts:
  ```typescript
  import { anthropic } from '@ai-sdk/anthropic';

  export const aiConfig = {
    baseURL: process.env.AI_GATEWAY_URL,
    model: anthropic('claude-3-5-sonnet-20241022'),
    maxTokens: 4000,
    temperature: 0.7,
  };

  export const rateLimits = {
    requestsPerMinute: 10,
    tokensPerMinute: 50000,
  };
  ```
- Implement rate limiting per workspace
- Add cost tracking logging
- Setup cache configuration (1 hour TTL)
- **File**: lib/ai/config.ts
- **Dependencies**: Task 3
- **Deliverable**: AI configuration with rate limits
- **Risk**: Cost overruns without proper limits

### Core Components - Split View

**Task 5: Split View Layout Component (4 hours)**

- Create SplitViewEditor component:
  ```tsx
  // app/w/[slug]/admin/settings/email/components/SplitViewEditor.tsx
  'use client';

  import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

  export function SplitViewEditor({ template, onSave }) {
    const [html, setHtml] = useState(template.html);

    return (
      <div className="flex flex-col h-full">
        <AIAssistPanel />

        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50}>
            <HTMLEditor value={html} onChange={setHtml} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50}>
            <EmailPreview html={html} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }
  ```
- Implement resizable panels
- Add panel persistence (localStorage)
- Handle responsive layout
- **File**: app/w/[slug]/admin/settings/email/components/SplitViewEditor.tsx
- **Dependencies**: Task 3
- **Deliverable**: Working split-view layout
- **Risk**: Layout issues on mobile

**Task 6: HTML Editor Component (5 hours)**

- Integrate Monaco Editor:
  ```tsx
  import { Editor } from '@monaco-editor/react';

  export function HTMLEditor({ value, onChange, suggestedHtml }) {
    return (
      <div className="relative h-full">
        <Editor
          height="100%"
          language="html"
          value={suggestedHtml || value}
          onChange={onChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            formatOnPaste: true,
          }}
        />
      </div>
    );
  }
  ```
- Add syntax highlighting
- Implement auto-completion for HTML tags
- Add template variable auto-complete
- Track text selection for contextual edits
- **File**: app/w/[slug]/admin/settings/email/components/HTMLEditor.tsx
- **Dependencies**: Task 5
- **Deliverable**: Monaco editor with HTML support
- **Risk**: Performance issues with large templates

**Task 7: Email Preview Component (4 hours)**

- Create EmailPreview component:
  ```tsx
  export function EmailPreview({ html, subject, variables }) {
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [processedHtml, setProcessedHtml] = useState('');

    useEffect(() => {
      // Replace template variables with sample data
      let processed = html;
      variables.forEach((variable) => {
        processed = processed.replace(
          new RegExp(`{{${variable}}}`, 'g'),
          getSampleValue(variable)
        );
      });

      // Inline CSS for email compatibility
      inlineStyles(processed).then(setProcessedHtml);
    }, [html, variables]);

    return (
      <Card>
        <CardHeader>
          <div className="flex gap-2">
            <Button onClick={() => setViewMode('desktop')}>
              <Monitor />
            </Button>
            <Button onClick={() => setViewMode('mobile')}>
              <Smartphone />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <iframe
            srcDoc={getIframeContent(processedHtml)}
            className={viewMode === 'mobile' ? 'w-[375px]' : 'w-full'}
          />
        </CardContent>
      </Card>
    );
  }
  ```
- Implement desktop/mobile toggle
- Add safe HTML rendering (sandboxed iframe)
- Process template variables with sample data
- Inline CSS with Juice library
- **File**: app/w/[slug]/admin/settings/email/components/EmailPreview.tsx
- **Dependencies**: Task 5
- **Deliverable**: Live preview with responsive toggle
- **Risk**: XSS vulnerabilities if not sandboxed properly

### API Routes - Template CRUD

**Task 8: Template List/Create API (3 hours)**

- Create GET/POST /api/workspaces/[slug]/email-templates:
  ```typescript
  export async function GET(req: NextRequest, { params }) {
    const { workspace } = await requireWorkspaceAdmin(req, params.slug);

    const templates = await prisma.emailTemplate.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: 'desc' },
    });

    return Response.json({ templates });
  }

  export async function POST(req: NextRequest, { params }) {
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
  ```
- Implement workspace isolation
- Add validation (Zod schema)
- Handle template variable extraction
- **File**: app/api/workspaces/[slug]/email-templates/route.ts
- **Dependencies**: Task 2 (schema exists)
- **Deliverable**: Template CRUD API
- **Risk**: Missing workspace validation

**Task 9: Template Update/Delete API (2 hours)**

- Create PUT/DELETE /api/workspaces/[slug]/email-templates/[id]:
  ```typescript
  export async function PUT(req: NextRequest, { params }) {
    const { workspace } = await requireWorkspaceAdmin(req, params.slug);
    const { name, subject, html, variables } = await req.json();

    // Verify template belongs to workspace
    const template = await prisma.emailTemplate.update({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
      data: { name, subject, html, variables, updatedAt: new Date() },
    });

    return Response.json({ template });
  }
  ```
- Implement update logic
- Implement delete logic
- Add audit logging (ActivityEvent)
- **File**: app/api/workspaces/[slug]/email-templates/[id]/route.ts
- **Dependencies**: Task 8
- **Deliverable**: Complete CRUD operations
- **Risk**: Deleting built-in templates

### Template Management UI

**Task 10: Template Picker Component (3 hours)**

- Create TemplatePicker component:
  ```tsx
  export function TemplatePicker({ onSelect, currentTemplateId }) {
    const { data } = useSWR('/api/workspaces/acme/email-templates');

    return (
      <Select value={currentTemplateId} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select template..." />
        </SelectTrigger>
        <SelectContent>
          {data?.templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  ```
- Implement template selection dropdown
- Show template metadata (last used, usage count)
- Add "New Template" button
- **File**: app/w/[slug]/admin/settings/email/components/TemplatePicker.tsx
- **Dependencies**: Task 8 (API exists)
- **Deliverable**: Template selection UI
- **Risk**: Performance with 100+ templates

**Task 11: Main Email Settings Page (4 hours)**

- Create app/w/[slug]/admin/settings/email/page.tsx:
  ```tsx
  export default async function EmailSettingsPage({ params }) {
    const templates = await getEmailTemplates(params.slug);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1>Email Templates</h1>
          <Button>New Template</Button>
        </div>

        <TemplatePicker templates={templates} />

        <SplitViewEditor
          template={selectedTemplate}
          onSave={handleSave}
        />
      </div>
    );
  }
  ```
- Server component for template fetching
- Integrate all child components
- Add save/cancel buttons
- Handle loading states
- **File**: app/w/[slug]/admin/settings/email/page.tsx
- **Dependencies**: Tasks 5, 10
- **Deliverable**: Complete email settings page
- **Risk**: Complex state management

**Task 12: Phase 1 Testing & Validation (3 hours)**

- Test split-view editor renders correctly
- Test Monaco editor syntax highlighting
- Test preview iframe sandboxing
- Test template CRUD operations
- Test workspace isolation
- Verify responsive layout (mobile/tablet)
- **Dependencies**: All Phase 1 tasks
- **Deliverable**: Working MVP without AI
- **Risk**: UI bugs on different browsers

---

## Phase 2: AI Integration (Week 2) - 12 Tasks

### AI Assist Hook

**Task 13: AI Assist Hook - Core Logic (5 hours)**

- Create useAIEmailAssist hook:
  ```typescript
  export function useAIEmailAssist() {
    const [suggestedHtml, setSuggestedHtml] = useState<string | null>(null);

    const { complete, isLoading } = useCompletion({
      api: '/api/ai/email-assist',
      onFinish: (prompt, completion) => {
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

    return {
      isProcessing: isLoading,
      suggestedHtml,
      applyAIEdit,
      rejectEdit: () => setSuggestedHtml(null),
      hasActiveSuggestion: !!suggestedHtml,
    };
  }
  ```
- Implement prompt building logic
- Handle streaming responses
- Extract HTML from AI response
- Manage suggestion state
- **File**: app/w/[slug]/admin/settings/email/hooks/useAIEmailAssist.ts
- **Dependencies**: Task 4 (AI config)
- **Deliverable**: AI assist React hook
- **Risk**: Streaming errors not handled properly

**Task 14: AI Prompt Engineering (3 hours)**

- Create prompt builder function:
  ```typescript
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
- Design system prompts
- Add email-safe HTML constraints
- Handle template variables preservation
- Test with various instructions
- **File**: app/w/[slug]/admin/settings/email/lib/prompts.ts
- **Dependencies**: Task 13
- **Deliverable**: Optimized AI prompts
- **Risk**: AI generates invalid HTML

**Task 15: AI API Route (3 hours)**

- Create POST /api/ai/email-assist:
  ```typescript
  import { streamText } from 'ai';
  import { anthropic } from '@ai-sdk/anthropic';

  export async function POST(req: Request) {
    const { user, workspace } = await requireWorkspaceAdmin(req);
    const { prompt } = await req.json();

    // Rate limiting check
    await checkRateLimit(workspace.id, 'email-ai-assist');

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
- Implement streaming endpoint
- Add workspace-based rate limiting
- Log AI requests for cost tracking
- Handle API errors gracefully
- **File**: app/api/ai/email-assist/route.ts
- **Dependencies**: Task 13
- **Deliverable**: Streaming AI API
- **Risk**: Cost overruns without rate limits

### AI Assist Panel UI

**Task 16: AI Assist Panel Component (5 hours)**

- Create AIAssistPanel component:
  ```tsx
  export function AIAssistPanel({
    currentHtml,
    selectedText,
    onApplyEdit,
    disabled,
  }) {
    const [instruction, setInstruction] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const quickPrompts = [
      'Make the header more prominent',
      'Add a call-to-action button',
      'Improve mobile responsiveness',
      'Use brand colors',
      'Add social media links in footer',
    ];

    return (
      <Card className="p-4 mb-4">
        <label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-coral-500" />
          AI Assist
        </label>

        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Describe how you want to modify the email template..."
        />

        <div className="flex gap-2 mt-2">
          {quickPrompts.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              onClick={() => setInstruction(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>

        <Button onClick={handleApply} disabled={!instruction.trim() || isProcessing}>
          <Sparkles /> Apply AI Edit
        </Button>
      </Card>
    );
  }
  ```
- Implement instruction input
- Add quick prompt buttons
- Show processing state
- Display contextual hints (selected text)
- **File**: app/w/[slug]/admin/settings/email/components/AIAssistPanel.tsx
- **Dependencies**: Task 13
- **Deliverable**: AI instruction UI
- **Risk**: UX confusion about how to use

**Task 17: Accept/Reject Controls (3 hours)**

- Add suggestion controls to HTMLEditor:
  ```tsx
  {hasActiveSuggestion && (
    <div className="absolute top-2 right-2 z-10 flex gap-2">
      <Button
        size="sm"
        onClick={onAcceptSuggestion}
        className="bg-green-600"
      >
        <Check /> Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onRejectSuggestion}
      >
        <X /> Reject
      </Button>
    </div>
  )}
  ```
- Implement accept/reject buttons
- Add keyboard shortcuts (Cmd+Enter to accept)
- Show diff indicators
- **File**: app/w/[slug]/admin/settings/email/components/HTMLEditor.tsx (modified)
- **Dependencies**: Task 6
- **Deliverable**: Suggestion approval UI
- **Risk**: Accidental acceptance without review

### Integration & State Management

**Task 18: Integrate AI Hook with Components (4 hours)**

- Wire useAIEmailAssist to SplitViewEditor
- Pass suggestion state to HTMLEditor
- Handle accept/reject actions
- Update preview on suggestion changes
- Manage optimistic UI updates
- **File**: app/w/[slug]/admin/settings/email/components/SplitViewEditor.tsx (modified)
- **Dependencies**: Tasks 13, 16, 17
- **Deliverable**: Fully integrated AI workflow
- **Risk**: State management bugs

**Task 19: Error Handling & User Feedback (3 hours)**

- Add error toast notifications
- Handle AI timeout (30 seconds)
- Handle rate limit errors
- Show cost warnings (if approaching limit)
- Display helpful error messages
- **Dependencies**: Task 18
- **Deliverable**: Robust error handling
- **Risk**: Silent failures confusing users

**Task 20: Template Variable Auto-Detection (2 hours)**

- Create variable extraction utility:
  ```typescript
  function extractVariables(html: string): string[] {
    const matches = html.matchAll(/{{([a-zA-Z_][a-zA-Z0-9_]*)}}/g);
    return [...new Set([...matches].map(m => m[1]))];
  }
  ```
- Auto-detect variables in HTML
- Update EmailTemplate.variables on save
- Show variable list in UI
- Warn if AI removes variables
- **File**: app/w/[slug]/admin/settings/email/lib/variables.ts
- **Dependencies**: Task 18
- **Deliverable**: Variable management
- **Risk**: Regex edge cases

**Task 21: Debouncing & Performance Optimization (2 hours)**

- Add debounced AI requests (500ms):
  ```typescript
  const debouncedApply = useDebouncedCallback(
    (instruction: string, html: string) => {
      return complete(buildPrompt(instruction, html));
    },
    500
  );
  ```
- Implement request cancellation
- Add loading skeletons
- Optimize Monaco editor re-renders
- **Dependencies**: Task 18
- **Deliverable**: Optimized performance
- **Risk**: Memory leaks from uncancelled requests

### Testing & Validation

**Task 22: AI Integration Tests (4 hours)**

- Test AI prompt generation
- Test HTML extraction from responses
- Mock AI SDK responses
- Test rate limiting
- Test error scenarios (timeout, invalid response)
- Test variable preservation
- **File**: tests/unit/ai-email-assist.test.ts
- **Dependencies**: Tasks 13-21
- **Deliverable**: Comprehensive test suite
- **Risk**: Mocks not matching real AI behavior

**Task 23: E2E AI Workflow Test (3 hours)**

- Test full AI assist flow:
  1. User types instruction
  2. AI generates suggestion
  3. Preview updates
  4. User accepts suggestion
  5. Editor updates with new HTML
- Test rejection flow
- Test selected text editing
- **File**: tests/e2e/email-editor.spec.ts
- **Dependencies**: Task 22
- **Deliverable**: E2E test coverage
- **Risk**: Flaky tests due to AI randomness

**Task 24: Phase 2 Gate Review (2 hours)**

- Review AI cost per request (<$0.05)
- Verify rate limits working
- Test with 10 different instructions
- Measure response time (<5 seconds)
- Security audit of AI prompts
- **Dependencies**: All Phase 2 tasks
- **Deliverable**: GO/NO-GO for Phase 3
- **Risk**: AI costs too high for production

---

## Phase 3: Advanced Features (Week 3) - 10 Tasks

### Diff View & Version History

**Task 25: Diff Viewer Component (5 hours)**

- Create DiffViewer component using react-diff-viewer-continued:
  ```tsx
  import ReactDiffViewer from 'react-diff-viewer-continued';

  export function DiffViewer({ oldHtml, newHtml }) {
    return (
      <ReactDiffViewer
        oldValue={oldHtml}
        newValue={newHtml}
        splitView={true}
        useDarkTheme={true}
        leftTitle="Current"
        rightTitle="AI Suggestion"
      />
    );
  }
  ```
- Implement side-by-side diff
- Add inline diff option
- Highlight template variables
- **File**: app/w/[slug]/admin/settings/email/components/DiffViewer.tsx
- **Dependencies**: Task 17
- **Deliverable**: Visual diff component
- **Risk**: Performance with large diffs

**Task 26: Version History Schema (2 hours)**

- Add EmailTemplateVersion model:
  ```prisma
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
- Generate migration
- Test on staging clone
- **File**: prisma/schema.prisma
- **Dependencies**: Task 1
- **Deliverable**: Version history schema
- **Risk**: Storage costs for large templates

**Task 27: Auto-Save & Version Creation (3 hours)**

- Implement auto-save on template changes
- Create new version on manual save
- Limit to 10 versions per template
- Add "Restore Version" functionality
- **Dependencies**: Task 26
- **Deliverable**: Version history feature
- **Risk**: Database growth

### Template Management

**Task 28: Built-in Templates (4 hours)**

- Create seed data for built-in templates:
  - Welcome Email
  - Challenge Enrollment Confirmation
  - Submission Approved
  - Reward Issued
- Mark templates with isBuiltIn=true
- Prevent deletion of built-in templates
- Allow cloning built-in templates
- **File**: prisma/seed.ts
- **Dependencies**: Task 2
- **Deliverable**: 4 built-in templates
- **Risk**: Templates not matching brand

**Task 29: Template Categories & Tags (3 hours)**

- Add category field to EmailTemplate
- Implement tag system (String[])
- Add category/tag filtering UI
- Create searchable template library
- **Dependencies**: Task 10
- **Deliverable**: Organized template management
- **Risk**: Taxonomy complexity

**Task 30: Template Import/Export (3 hours)**

- Export template as JSON
- Import template from JSON
- Validate imported templates
- Handle variable mapping on import
- **Dependencies**: Task 8
- **Deliverable**: Template portability
- **Risk**: Security issues with imported HTML

### AI Enhancements

**Task 31: AI Suggestions on Load (4 hours)**

- Analyze template on load
- Generate proactive suggestions:
  - "Add mobile-responsive table layout"
  - "Include unsubscribe link"
  - "Improve heading hierarchy"
- Show suggestions panel
- Allow one-click application
- **File**: app/w/[slug]/admin/settings/email/components/SuggestionsPanel.tsx
- **Dependencies**: Task 15
- **Deliverable**: Proactive AI suggestions
- **Risk**: Too many suggestions overwhelming users

**Task 32: Quick Actions (2 hours)**

- Add preset AI actions:
  - "Make mobile-friendly"
  - "Add social links"
  - "Improve contrast"
  - "Add CTA button"
- One-click application
- Show before/after preview
- **Dependencies**: Task 16
- **Deliverable**: Quick action buttons
- **Risk**: Actions not customizable enough

### Testing

**Task 33: Advanced Feature Tests (4 hours)**

- Test diff viewer rendering
- Test version history CRUD
- Test built-in template protection
- Test import/export
- Test AI suggestions
- **File**: tests/integration/email-editor-advanced.spec.ts
- **Dependencies**: Tasks 25-32
- **Deliverable**: Comprehensive test coverage
- **Risk**: Complex test scenarios

**Task 34: Phase 3 Gate Review (2 hours)**

- Review all advanced features
- Measure storage usage (versions)
- Test import/export security
- Performance test with 50+ templates
- **Dependencies**: All Phase 3 tasks
- **Deliverable**: GO/NO-GO for Phase 4
- **Risk**: Performance degradation

---

## Phase 4: Production Readiness (Week 4) - 10 Tasks

### Cost Optimization

**Task 35: AI Gateway Setup (3 hours)**

- Configure Cloudflare AI Gateway or Vercel AI Gateway
- Set cache TTL (1 hour for identical prompts)
- Configure rate limits per workspace
- Enable request/response logging
- Set up cost alerts
- **Dependencies**: Task 4
- **Deliverable**: Production AI Gateway
- **Risk**: Gateway downtime affecting feature

**Task 36: Request Caching Strategy (2 hours)**

- Cache AI responses for identical (instruction + HTML) pairs
- Implement cache key hashing
- Set cache expiration (1 hour)
- Add cache hit/miss metrics
- **Dependencies**: Task 35
- **Deliverable**: Reduced AI costs
- **Risk**: Stale cache serving outdated suggestions

**Task 37: Cost Dashboard (3 hours)**

- Create admin cost tracking page
- Show AI requests per workspace
- Display estimated monthly cost
- Show cache hit rate
- Add budget warnings
- **File**: app/w/[slug]/admin/analytics/ai-costs/page.tsx
- **Dependencies**: Task 36
- **Deliverable**: AI cost visibility
- **Risk**: Inaccurate cost estimates

### Security & Validation

**Task 38: HTML Sanitization (3 hours)**

- Implement HTML sanitization before save:
  ```typescript
  import DOMPurify from 'isomorphic-dompurify';

  function sanitizeEmailHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'div', 'table', 'tr', 'td', 'a', 'img', 'h1', 'h2', 'h3', 'span', 'strong', 'em'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class', 'width', 'height'],
    });
  }
  ```
- Whitelist safe HTML tags
- Remove script tags
- Validate external URLs
- Test XSS prevention
- **File**: lib/email/sanitize.ts
- **Dependencies**: None
- **Deliverable**: Secure HTML handling
- **Risk**: Breaking legitimate email HTML

**Task 39: AI Prompt Injection Prevention (2 hours)**

- Sanitize user instructions
- Detect prompt injection attempts
- Add system prompt hardening
- Log suspicious instructions
- **Dependencies**: Task 14
- **Deliverable**: Secure AI prompts
- **Risk**: False positives blocking legitimate use

**Task 40: Security Audit (4 hours)**

- Penetration test AI endpoints
- Test XSS in templates
- Verify workspace isolation
- Test RBAC enforcement
- Review error messages for info leaks
- **Dependencies**: Tasks 38, 39
- **Deliverable**: Security audit report
- **Risk**: Critical vulnerabilities discovered late

### Testing & Documentation

**Task 41: Performance Testing (4 hours)**

- Load test with 100 concurrent AI requests
- Measure preview rendering time
- Test editor with 50KB HTML templates
- Optimize slow queries
- Add performance monitoring
- **Dependencies**: All features complete
- **Deliverable**: Performance benchmarks
- **Risk**: Production scale exceeding tests

**Task 42: Cross-Browser Testing (3 hours)**

- Test on Chrome, Firefox, Safari, Edge
- Test mobile browsers (iOS Safari, Chrome Mobile)
- Verify Monaco editor compatibility
- Test iframe rendering
- Fix browser-specific bugs
- **Dependencies**: All UI complete
- **Deliverable**: Cross-browser support
- **Risk**: Monaco editor issues on Safari

**Task 43: User Documentation (4 hours)**

- Write admin guide for email templates
- Document AI assist best practices
- Create video tutorial (optional)
- Document template variables
- Write troubleshooting guide
- **File**: docs/guides/email-templates.md
- **Dependencies**: All features complete
- **Deliverable**: Complete user docs
- **Risk**: Docs out of sync with UI

**Task 44: Production Deployment (3 hours)**

- Deploy to staging
- Run smoke tests
- Monitor AI costs for 24 hours
- Deploy to production
- Monitor error rates
- Enable for pilot workspaces first
- **Dependencies**: All Phase 4 tasks
- **Deliverable**: Production deployment
- **Risk**: Production issues not caught in staging

---

## Success Metrics

### Phase 1 (Foundation)
- Split-view editor renders in <2 seconds
- Template CRUD operations work end-to-end
- Preview accurately shows email in desktop/mobile modes
- Zero XSS vulnerabilities in preview

### Phase 2 (AI Integration)
- AI generates valid HTML 95% of the time
- Average AI response time <5 seconds
- AI cost <$0.05 per request
- Rate limits prevent abuse
- Zero prompt injection incidents

### Phase 3 (Advanced Features)
- Diff view renders in <1 second
- Version history supports 10+ versions per template
- Built-in templates cover 80% of common use cases
- Import/export works with 100% fidelity

### Phase 4 (Production)
- Cache hit rate >30% (reduces AI costs)
- Zero security vulnerabilities
- Works on all major browsers
- <2% error rate in production
- User adoption >60% within first month

---

## Risk Mitigation

### High-Risk Items

1. **AI Cost Overruns**
   - Risk: Uncapped AI requests drain budget
   - Mitigation: Strict rate limits, AI Gateway caching, cost alerts

2. **XSS via Generated HTML**
   - Risk: AI generates malicious HTML
   - Mitigation: DOMPurify sanitization, sandboxed previews, CSP headers

3. **Performance with Large Templates**
   - Risk: Editor/preview slow with 50KB+ HTML
   - Mitigation: Lazy loading, virtualization, debouncing

4. **AI Reliability**
   - Risk: AI generates invalid or unsafe HTML
   - Mitigation: Prompt engineering, validation, human review step

### Medium-Risk Items

1. **Browser Compatibility**
   - Risk: Monaco editor issues on older browsers
   - Mitigation: Progressive enhancement, fallback plain textarea

2. **Storage Costs**
   - Risk: Version history consumes excessive storage
   - Mitigation: Limit versions per template, compress HTML

3. **Template Variable Management**
   - Risk: Complex variable systems confuse users
   - Mitigation: Clear documentation, auto-detection, validation

---

## Dependencies

### External Dependencies
- Vercel AI SDK (API stability)
- Anthropic Claude API (uptime, rate limits)
- Monaco Editor (browser support)
- AI Gateway (caching, cost optimization)

### Internal Dependencies
- Workspace RBAC system (admin-only access)
- Email sending infrastructure (for template testing)
- Database schema stability (no breaking changes)

---

## Rollback Plan

### Phase 1-2 Rollback
- Remove email settings page from navigation
- Keep database schema (no data loss)
- Feature flag: `FEATURE_AI_EMAIL_EDITOR=false`

### Phase 3-4 Rollback
- Disable AI Gateway
- Remove AI assist panel from UI
- Keep version history (useful even without AI)
- Revert to manual HTML editing only

---

## Technical Debt & Future Enhancements

### Phase 5 (Future - Not in MVP)

1. **A/B Testing Email Templates**
   - Test subject lines and layouts
   - Track open rates, click rates
   - Auto-select best performer

2. **AI-Powered Subject Line Generation**
   - Generate multiple subject line options
   - Test against best practices
   - Predict open rates

3. **Personalization Recommendations**
   - AI suggests dynamic content blocks
   - Recommend variable usage
   - Optimize for recipient segments

4. **Email Analytics Integration**
   - Track template performance
   - Show engagement metrics per template
   - AI suggestions based on analytics

5. **Multi-Language Support**
   - AI translation of templates
   - Variable localization
   - Right-to-left language support

---

## References

**Brainstorm Document**: `docs/planning/ai-email-editor-brainstorm.md`

**Key Implementation Files**:
- `app/w/[slug]/admin/settings/email/page.tsx` - Main settings page
- `lib/ai/config.ts` - AI SDK configuration
- `app/api/ai/email-assist/route.ts` - AI streaming endpoint
- `prisma/schema.prisma` - EmailTemplate model

**External Documentation**:
- Vercel AI SDK: https://sdk.vercel.ai/docs
- Monaco Editor: https://microsoft.github.io/monaco-editor/
- Juice (CSS Inliner): https://github.com/Automattic/juice
- DOMPurify: https://github.com/cure53/DOMPurify

---

*Roadmap Version 1.0 | Created: January 2025 | Estimated: 4 weeks*
