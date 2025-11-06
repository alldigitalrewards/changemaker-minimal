# AI Email Composer - Template Management Architecture

## Overview

This document outlines the template management system for the AI-first email composer, addressing the question: "Where will the saved templates be listed and interacted?"

## Current System Analysis

### Existing Template Management
- **Location**: `/w/[slug]/admin/emails` (Templates tab)
- **Pattern**: Collapsible cards per template type (INVITE, EMAIL_RESENT, etc.)
- **Editing**: In-place editing with Monaco editor + preview
- **Storage**: `WorkspaceEmailTemplate` table (type, subject, html, enabled)

### Template Types (5 predefined types)
```typescript
enum EmailTemplateType {
  INVITE
  EMAIL_RESENT
  ENROLLMENT_UPDATE
  REMINDER
  GENERIC
}
```

## Proposed AI-First Architecture

### 1. Navigation Structure

Add a new tab to `/w/[slug]/admin/emails`:

```
┌─────────────────────────────────────────────────┐
│ Emails                                          │
├─────────────────────────────────────────────────┤
│ [ Default Emails ] [ Templates ] [ AI Composer ] [ Settings ] │
└─────────────────────────────────────────────────┘
```

**Tabs**:
- **Default Emails**: System defaults (unchanged)
- **Templates**: Manage saved templates (traditional editing)
- **AI Composer**: NEW - Conversational email generation
- **Settings**: Email settings (unchanged)

### 2. AI Composer Tab Layout

```
┌────────────────────────────────────────────────────────────────┐
│ AI Email Composer                                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐  ┌────────────────────────────────┐ │
│  │  Template Browser   │  │  Conversation + Preview        │ │
│  │  ─────────────────  │  │  ───────────────────────────   │ │
│  │                     │  │                                │ │
│  │  [Search templates] │  │  ┌──────────────────────────┐ │ │
│  │                     │  │  │  Conversation Messages   │ │ │
│  │  Quick Start:       │  │  │  ──────────────────────  │ │ │
│  │  • Start blank      │  │  │  User: Create invite...  │ │ │
│  │  • Load template    │  │  │  AI: I'll create...      │ │ │
│  │                     │  │  │  [Streaming HTML]        │ │ │
│  │  Saved Templates:   │  │  └──────────────────────────┘ │ │
│  │  ┌───────────────┐  │  │                                │ │
│  │  │ INVITE        │  │  │  ┌──────────────────────────┐ │ │
│  │  │ Challenge...  │  │  │  │  Live Preview            │ │ │
│  │  │ Updated 2h ago│  │  │  │  ──────────────────────  │ │ │
│  │  └───────────────┘  │  │  │  [Email renders here     │ │ │
│  │  ┌───────────────┐  │  │  │   as AI generates it]    │ │ │
│  │  │ REMINDER      │  │  │  │                          │ │ │
│  │  │ Weekly...     │  │  │  └──────────────────────────┘ │ │
│  │  │ Updated 1d ago│  │  │                                │ │
│  │  └───────────────┘  │  │  [Input with suggestions...]   │ │
│  │                     │  │                                │ │
│  │  [View All]         │  │  [Save as Template] [Settings] │ │
│  └─────────────────────┘  └────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 3. Template Storage Schema Enhancement

**Add new fields to `WorkspaceEmailTemplate`**:

```prisma
model WorkspaceEmailTemplate {
  id          String            @id @db.Uuid
  workspaceId String            @db.Uuid
  type        EmailTemplateType

  // Existing fields
  subject     String?
  html        String?
  enabled     Boolean           @default(false)
  updatedBy   String?           @db.Uuid
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @default(now())

  // NEW: AI-specific fields
  name        String?           // User-friendly name: "Challenge Invitation", "Weekly Reminder"
  description String?           // Brief description of template purpose
  tags        String[]          @default([]) // Tags for categorization: ["onboarding", "reminder"]

  // NEW: Conversation history
  conversationHistory Json?     // Array of AI conversation messages that generated this template
  aiModel     String?           // Model used: "claude-sonnet-4-5-20250929"
  generatedByAI Boolean         @default(false) // Whether created via AI composer

  // NEW: Version tracking
  version     Int              @default(1)
  previousVersionId String?    @db.Uuid        // Parent template if this is a version

  User        User?             @relation(fields: [updatedBy], references: [id])
  Workspace   Workspace         @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, type, name]) // Allow multiple templates per type with unique names
  @@index([workspaceId])
  @@index([workspaceId, type])
  @@index([workspaceId, generatedByAI])
}
```

### 4. Template Browser Component

**Location**: `/components/emails/TemplateBrowser.tsx`

**Features**:
- **Quick Start Actions**:
  - "Start from Blank" - Begin new conversation
  - "Load Template" - Browse and load existing template

- **Template List**:
  - Group by type (INVITE, REMINDER, etc.)
  - Search/filter by name, tags, type
  - Sort by: Recent, Name, Type
  - Visual preview thumbnails (iframe of HTML)

- **Template Card**:
  ```
  ┌──────────────────────────┐
  │ [Preview Thumbnail]      │
  │ INVITE                   │
  │ Challenge Kickoff        │
  │ "Exciting new challenge" │
  │ Updated 2 hours ago      │
  │ [Load] [Edit] [•••]      │
  └──────────────────────────┘
  ```

- **Actions per template**:
  - **Load**: Opens in AI conversation for refinement
  - **Edit**: Opens in traditional Templates tab
  - **Duplicate**: Create a copy
  - **Delete**: Remove template
  - **View History**: See conversation that created it

### 5. Conversation Interface

**Location**: `/components/emails/AIConversationPanel.tsx`

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Conversation History                            │
│ ────────────────────────────────────────────────│
│                                                 │
│ 💬 You: Create an email template for inviting  │
│         participants to a new challenge         │
│                                                 │
│ 🤖 AI: I'll create a professional invitation... │
│        [Streaming HTML appears here]            │
│                                                 │
│ 💬 You: Add a bold call-to-action button       │
│                                                 │
│ 🤖 AI: I've added a prominent CTA button...    │
│        [Updated HTML streams here]              │
│                                                 │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ Live Preview (updates as AI generates)          │
│ [Email renders here with variable replacement] │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ Type your message or use suggestions...        │
│ Suggestions:                                    │
│ • "Make the header more colorful"              │
│ • "Add recipient name personalization"         │
│ • "Include workspace logo"                     │
│                                                 │
│ [Advanced: View HTML Code] 📝                   │
└─────────────────────────────────────────────────┘
```

**Key Features**:
- Real-time streaming AI responses
- Live preview updates as HTML generates
- Suggested refinements based on context
- Progressive disclosure: HTML editor hidden by default
- "Save as Template" button always visible
- Context-aware suggestions (knows template type, workspace)

### 6. Interaction Flows

#### Flow 1: Create New Template from Scratch

```
User Action                        System Response
────────────────────────────────   ─────────────────────────────────────
1. Clicks "AI Composer" tab        → Shows template browser + blank conversation
2. Clicks "Start from Blank"       → Shows conversation input
3. Types: "Create INVITE template  → AI begins streaming HTML
   for challenge kickoff"          → Preview updates in real-time
4. Reviews preview                 → Can refine with follow-up messages
5. Types: "Add bold CTA"           → AI modifies HTML, streams update
6. Clicks "Save as Template"       → Modal: Name, Type, Tags
7. Enters "Challenge Kickoff"      → Saves with conversation history
8. Confirms                        → Template appears in browser
                                   → Template available in Templates tab
```

#### Flow 2: Load and Refine Existing Template

```
User Action                        System Response
────────────────────────────────   ─────────────────────────────────────
1. In template browser             → Shows list of saved templates
2. Searches "reminder"             → Filters to reminder templates
3. Clicks "Load" on template       → Loads HTML into conversation
                                   → Shows conversation that created it
4. Types: "Make it more casual"    → AI refines existing HTML
5. Reviews changes                 → Preview updates with refinements
6. Clicks "Save as Template"       → Modal: "Update existing or save new?"
7. Selects "Update existing"       → Updates template, increments version
                                   → Keeps conversation history
```

#### Flow 3: Switch to Traditional Editor

```
User Action                        System Response
────────────────────────────────   ─────────────────────────────────────
1. In AI Composer                  → Shows "Advanced: View HTML Code"
2. Clicks "View HTML Code"         → Slides open Monaco editor
                                   → Shows generated HTML
3. Makes direct HTML edits         → Preview updates
4. Can still send AI messages      → AI can refine based on edits
5. Clicks "Save as Template"       → Saves with both conversation + manual edits
```

#### Flow 4: Manage Templates

```
User Action                        System Response
────────────────────────────────   ─────────────────────────────────────
1. Clicks "Templates" tab          → Shows traditional template management
2. Sees all saved templates        → Includes AI-generated templates
3. AI templates have badge         → "🤖 AI Generated"
4. Clicks template                 → Can edit traditionally OR
5. Clicks "Open in AI Composer"    → Loads into conversation for AI refinement
```

### 7. Template Management API Endpoints

**New endpoints needed**:

```typescript
// List templates with AI metadata
GET /api/workspaces/[slug]/emails/templates?filter=ai-generated&search=reminder

// Get template with conversation history
GET /api/workspaces/[slug]/emails/templates/[id]?includeHistory=true

// Save AI-generated template
POST /api/workspaces/[slug]/emails/templates/ai-save
{
  name: "Challenge Kickoff",
  type: "INVITE",
  subject: "...",
  html: "...",
  tags: ["onboarding", "challenge"],
  conversationHistory: [...],
  aiModel: "claude-sonnet-4-5-20250929"
}

// Update existing template (creates new version)
PUT /api/workspaces/[slug]/emails/templates/[id]
{
  html: "...",
  conversationHistory: [...], // Appends to existing
  version: 2
}

// Get template versions
GET /api/workspaces/[slug]/emails/templates/[id]/versions

// Revert to previous version
POST /api/workspaces/[slug]/emails/templates/[id]/revert
{
  toVersionId: "previous-version-id"
}
```

### 8. Benefits of This Architecture

**For Users**:
✅ **Intuitive Discovery**: Templates organized by type with visual previews
✅ **Flexible Workflow**: Choose AI conversation OR traditional editing
✅ **Version Control**: Track changes and revert if needed
✅ **Context Preservation**: Conversation history helps understand template purpose
✅ **Progressive Disclosure**: Simple by default, powerful when needed

**For Developers**:
✅ **Backward Compatible**: Existing Templates tab still works
✅ **Incremental Migration**: Can roll out AI Composer gradually
✅ **Reusable Components**: TemplateBrowser + AIConversation are composable
✅ **Type Safety**: Full TypeScript support with Prisma schema

**For System**:
✅ **Data Integrity**: Templates stored in same table
✅ **Audit Trail**: Conversation history provides audit log
✅ **Scalability**: Can add more template types without UI changes

### 9. Implementation Phases

**Phase 1: Foundation** (Week 1)
- [ ] Update Prisma schema with AI fields
- [ ] Create migration for new fields
- [ ] Build TemplateBrowser component
- [ ] Add "AI Composer" tab to emails page

**Phase 2: AI Integration** (Week 2)
- [ ] Build AIConversationPanel component
- [ ] Implement streaming server action
- [ ] Connect to anthropic SDK
- [ ] Real-time preview updates

**Phase 3: Template Management** (Week 3)
- [ ] Implement save/load flows
- [ ] Add template search/filter
- [ ] Build version history
- [ ] Connect to Templates tab

**Phase 4: Polish** (Week 4)
- [ ] Add template thumbnails
- [ ] Implement suggested refinements
- [ ] Add bulk operations
- [ ] Performance optimization

### 10. Open Questions

1. **Template Naming**: Should we enforce unique names per workspace or allow duplicates with version numbers?
   - **Recommendation**: Unique names per type (handled by `@@unique([workspaceId, type, name])`)

2. **Conversation Storage**: How long to keep conversation history?
   - **Recommendation**: Keep indefinitely for audit trail, can truncate old histories after 90 days

3. **Version Limit**: Maximum versions per template?
   - **Recommendation**: Keep last 10 versions, archive older ones

4. **Template Sharing**: Should templates be shareable across workspaces?
   - **Recommendation**: Phase 2 feature - add `isPublic` flag and `WorkspaceEmailTemplateShare` table

5. **AI Model Selection**: Allow users to choose model?
   - **Recommendation**: No - use configured model from `email-ai-config.ts`, keep it simple

## Summary

Templates in the AI-first architecture are:

1. **Created** via conversational AI interface in "AI Composer" tab
2. **Listed** in left sidebar template browser with visual previews
3. **Managed** in traditional "Templates" tab with badge for AI-generated ones
4. **Stored** in same `WorkspaceEmailTemplate` table with enhanced metadata
5. **Versioned** automatically with conversation history preservation
6. **Interacted** with through:
   - Load into AI conversation for refinement
   - Edit traditionally in Templates tab
   - Duplicate for variations
   - View version history
   - Search/filter by name, type, tags

This architecture provides a seamless bridge between AI-first generation and traditional template management, ensuring users always have access to their templates regardless of how they were created.
