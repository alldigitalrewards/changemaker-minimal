  Activities Feature - Complete Integration Plan

  Core Concept

  Activities are tasks within challenges that participants complete to earn points and demonstrate engagement. Think of them as the
  "how" participants actually participate in challenges.

  Key Design Decisions

1. Two-Level Architecture

- Activity Templates (Workspace level): Reusable activity types that admins create once and use across multiple challenges
  - Example: "Daily Reflection", "Photo Submission", "Team Check-in"
  - Benefits: Consistency across challenges, time-saving for admins
- Activity Instances (Challenge level): Specific uses of templates within challenges
  - Can customize points, deadlines, requirements per challenge
  - Maintains workspace consistency while allowing flexibility

2. Submission Types

  Based on common engagement patterns:

- Text Submission: Written responses, reflections
- File Upload: Documents, presentations
- Photo Upload: Visual proof, creative submissions
- Link Submission: External content, social media posts
- Multiple Choice: Quick polls, surveys
- Video Submission: Video responses (store URL only)

3. Points & Gamification

- Each activity has a base point value
- Challenges have total point pools
- Participants accumulate points in their workspace "wallet"
- Simple leaderboard per challenge/workspace

  Database Schema Changes

  // Phase 1: Core Activities (6 models total)
  model ActivityTemplate {
  id              String        @id @default(uuid())
  name            String
  description     String
  type            ActivityType
  basePoints      Int           @default(10)
  workspaceId     String
  workspace       Workspace     @relation(...)
  activities      Activity[]    // Instances in challenges

  // Template configuration
  requiresApproval Boolean      @default(true)
  allowMultiple    Boolean      @default(false)  // Can submit multiple times?

  createdAt       DateTime
  updatedAt       DateTime
  }

  model Activity {
  id              String        @id @default(uuid())
  templateId      String
  template        ActivityTemplate @relation(...)
  challengeId     String
  challenge       Challenge     @relation(...)

  // Challenge-specific overrides
  pointsValue     Int           // Can override template
  maxSubmissions  Int           @default(1)
  deadline        DateTime?
  isRequired      Boolean       @default(false)

  submissions     ActivitySubmission[]
  }

  model ActivitySubmission {
  id              String        @id @default(uuid())
  activityId      String
  activity        Activity      @relation(...)
  userId          String
  user            User          @relation(...)
  enrollmentId    String
  enrollment      Enrollment    @relation(...)

  // Submission content
  textContent     String?       // For text submissions
  fileUrls        String[]      // For file/photo uploads
  linkUrl         String?       // For link submissions

  // Review & points
  status          SubmissionStatus @default(PENDING)
  pointsAwarded   Int?
  reviewNotes     String?
  reviewedBy      String?
  reviewedAt      DateTime?

  submittedAt     DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  }

  // Phase 2: Points System
  model PointsBalance {
  id              String        @id @default(uuid())
  userId          String
  user            User          @relation(...)
  workspaceId     String
  workspace       Workspace     @relation(...)

  totalPoints     Int           @default(0)
  availablePoints Int           @default(0)

  @@unique([userId, workspaceId])
  }

  Implementation Phases

  **Implementation Status:**

  - [X] Phase 1: Database Schema - Extended Prisma schema with ActivityTemplate, Activity, ActivitySubmission, PointsBalance models
  - [X] Phase 2: Activity Templates Management - Admin CRUD interface with /w/[slug]/admin/activity-templates page
  - [X] Phase 3: Challenge Integration - Link activities to challenges
  - [X] Phase 4: Participant Submission Flow - Submission forms and real database storage
  - [X] Phase 5: Admin Review System - Review dashboard and approval workflow
  - [X] Phase 6: Basic Points System - Points calculation and tracking

  **Phase 2 Complete:**

  - ✅ Admin sidebar navigation updated
  - ✅ Activity templates page with CRUD interface
  - ✅ API routes: GET/POST /api/workspaces/[slug]/activity-templates and PUT/DELETE [id]
  - ✅ Database query functions for activity templates
  - ✅ ActivityTemplateCard and ActivityTemplateForm components
  - ✅ Custom Switch UI component for form toggles
  - ✅ Type definitions and validation functions

  **Phase 3 Complete:**

  - ✅ Activities tab added to challenge detail page (/w/[slug]/admin/challenges/[id])
  - ✅ ChallengeActivities component for displaying and managing activities
  - ✅ ActivityTemplateSelector component for assigning templates to challenges
  - ✅ API routes: GET/POST /api/workspaces/[slug]/challenges/[id]/activities
  - ✅ Individual activity management: PUT/DELETE /api/workspaces/[slug]/challenges/[id]/activities/[activityId]
  - ✅ Challenge-specific activity configuration (points, deadlines, requirements)
  - ✅ Additional UI components: RadioGroup, Checkbox, Separator
  - ✅ Activity creation from templates with workspace isolation
  - ✅ Remove activities from challenges functionality

  Phase 1: Activity Templates & Management (Week 1)

1. Admin Features:
   - /w/[slug]/admin/activity-templates - CRUD for templates
   - Template library with categories
   - Preview how template looks to participants
2. API Routes:
   - /api/workspaces/[slug]/activity-templates
   - CRUD operations with workspace isolation
3. UI Components:
   - ActivityTemplateCard - Display template
   - ActivityTemplateForm - Create/edit dialog
   - ActivityTypeSelector - Choose submission type

  Phase 2: Challenge Integration (Week 1-2)

1. Challenge Creation Flow:
   - Step in challenge creation: "Add Activities"
   - Select from templates or create custom
   - Set points, deadlines, requirements
2. Challenge Management:
   - Activities tab in challenge edit page
   - Reorder activities
   - Enable/disable activities mid-challenge
3. Database Updates:
   - Extend Challenge model
   - Create Activity instances from templates

  Phase 3: Participant Experience (Week 2)

1. Challenge Details Page:
   - Activities section showing available/completed
   - Progress indicator (3/5 activities complete)
   - Points earned display
2. Submission Flow:
   - Modal/page for submissions
   - Different UI per activity type
   - File upload to Supabase storage
   - Save draft functionality
3. Activity Feed:
   - Recent submissions (if public)
   - Peer engagement features

  Phase 4: Review & Approval (Week 2-3)

1. Admin Review Dashboard:
   - /w/[slug]/admin/reviews
   - Queue of pending submissions
   - Bulk approve/reject
   - Add feedback
2. Notification System:
   - Email on approval/rejection
   - In-app notifications

  Phase 5: Points & Gamification (Week 3)

1. Points System:
   - Automatic calculation
   - Workspace wallet
   - Transaction history
2. Leaderboards:
   - Per challenge
   - Per workspace
   - Time-based (weekly/monthly)
3. Achievements/Badges (Optional):
   - Milestone rewards
   - Streak tracking

  Key UI/UX Flows

  Admin Creating Activity Template:

1. Navigate to Activity Templates
2. Click "Create Template"
3. Fill form:
   - Name: "Daily Reflection"
   - Type: Text Submission
   - Base Points: 10
   - Description & instructions
4. Save to library

  Admin Adding Activities to Challenge:

1. Create/Edit Challenge
2. Go to Activities tab
3. Browse templates or create custom
4. Configure for this challenge:
   - Override points (optional)
   - Set deadline
   - Mark as required/optional
5. Save challenge

  Participant Completing Activity:

1. View challenge details
2. See activities list with status badges
3. Click "Complete" on activity
4. Submit based on type:
   - Text: Rich text editor
   - Photo: Upload or camera
   - Link: URL input with preview
5. Confirm submission
6. See pending status

  Technical Considerations

1. File Storage:
   - Use Supabase Storage buckets
   - Organize by workspace/challenge/activity
   - Set size limits (10MB photos, 100MB videos)
2. Performance:
   - Paginate submission lists
   - Cache template data
   - Lazy load activity content
3. Security:
   - Validate file types
   - Scan uploads for malware
   - Rate limit submissions
4. Scalability:
   - Design for 1000s of submissions
   - Efficient query patterns
   - Consider queue for processing

  MVP Scope (What to build first)

  Essential Features:

1. Basic activity templates (text & photo only)
2. Simple submission flow
3. Manual admin review
4. Basic points tracking
5. Challenge integration

  Defer for Later:

1. Complex activity types (quizzes, surveys)
2. Automated approval rules
3. Peer review features
4. Advanced gamification
5. Analytics dashboard

  Migration from Existing

  Looking at your schema diagram, we'll:

1. Keep existing Enrollment model
2. Link submissions to enrollments
3. Maintain backward compatibility
4. Add activities as optional initially

  Success Metrics

- Admin can create 5 activity templates in < 10 minutes
- Participants complete 3+ activities per challenge
- 80% of submissions reviewed within 24 hours
- Page load < 2 seconds with 100 activities

  Next Steps

1. Validate Requirements: Does this align with your vision?
2. Prioritize Features: What's most important for launch?
3. Review Schema: Any concerns about the 6-model approach?
4. Set Timeline: Realistic deadlines for each phase?

  This plan maintains the minimalist approach while adding substantial value. We're essentially creating a lightweight LMS (Learning
  Management System) within your challenge platform.

  ✅ Successfully Completed FULL Activities Feature Implementation:

  **Phase 4-6 Completed (Critical MVP Features):**

1. **Real Submission Storage** - `/api/workspaces/[slug]/enrollments` route handles activity submissions:

   - Validates user enrollment in challenge
   - Checks submission limits and deadlines
   - Stores submissions with proper status (PENDING if requires approval, APPROVED otherwise)
   - Automatically awards points for auto-approved submissions
   - Updates user's PointsBalance in real-time
2. **Admin Review Interface** - Added "Submissions" tab in `/w/[slug]/admin/challenges/[id]`:

   - Lists all submissions for activities in that challenge
   - Shows participant name, submission content, and status
   - Approve/Reject buttons with review notes functionality
   - Real-time pending submission counts with badges
   - Visual status indicators (color-coded backgrounds)
3. **Submission History for Participants** - Enhanced participant challenge page:

   - Shows submission status for each activity ("Submitted", "Pending Review", "Approved", "Rejected")
   - Displays submission count (e.g., "2/3 submissions used")
   - Disables submit button when limit reached or deadline passed
   - Shows points earned vs available points in user's workspace balance
4. **Points Integration** - Complete points system:

   - When submission approved, updates PointsBalance table
   - Shows user's total earned points vs available points
   - Automatic point calculation and awarding
   - Workspace-isolated point tracking

  **Key Technical Components Added:**

- `SubmissionReviewButton` component with approval/rejection dialogs
- `/api/workspaces/[slug]/submissions/[id]/review` endpoint for admin reviews
- Points balance queries in `lib/db/queries.ts`
- Enhanced participant UI showing submission status and points earned
- Real submission validation (enrollment, limits, deadlines)

  **MVP Status: ✅ MERGE READY**

  The Activities feature now supports the complete flow:

  - Participant submits → Admin reviews → Points awarded → Balance updated
  - All database operations have proper error handling
  - UI uses existing shadcn/ui components
  - Maintains workspace isolation in all queries

  Looking at the admin perspective after completing these participant experience improvements, several critical gaps become apparent
  for a complete administrative workflow:

  Admin's Participant Experience Management Needs

  🔍 Current Admin Blind Spots:

  1. No Submission Review System

  - Participants can submit activities but admins have no interface to review, approve/reject, or provide feedback
  - Points requiring approval are stuck in limbo
  - No workflow for managing the review queue

  2. No Participant Oversight Dashboard

  - Admins can't see who's enrolled in their workspace
  - No visibility into participant progress across challenges
  - Can't identify disengaged or highly active participants

  3. Missing Challenge Analytics

  - No insights into which challenges drive engagement
  - Can't see completion rates, average time to complete, dropout patterns
  - No data to optimize challenge design

    🎯 Critical Missing Admin Features:

    Priority 1: Submission Review System

    Path: /w/[slug]/admin/submissions or integrated into challenges
  - Review Queue: All submissions requiring approval
  - Bulk Actions: Approve/reject multiple submissions
  - Feedback System: Provide comments with approval/rejection
  - Points Management: Manual point adjustments and corrections

    Priority 2: Participant Management Dashboard

    Path: /w/[slug]/admin/participants
  - Participant Directory: All workspace members with activity levels
  - Progress Tracking: Individual participant progress across challenges
  - Engagement Analytics: Activity patterns, last login, participation trends
  - Bulk Operations: Mass enrollment, communication, role management

    Priority 3: Challenge Performance Analytics

    Path: /w/[slug]/admin/analytics or enhanced challenge pages
  - Challenge Metrics: Enrollment rates, completion rates, average points earned
  - Activity Performance: Which activities drive most engagement
  - Participant Insights: Leaderboard trends, top performers, dropoff analysis
  - Export Capabilities: CSV/PDF reports for stakeholders

    🔄 Complete Admin-Participant Workflow:

    Current State: Admin creates challenge → Participants submit → WORKFLOW BREAKS

    Complete Workflow:

  1. Admin creates challenge with activities
  2. Participants discover and enroll
  3. Participants submit to activities
  4. Admin reviews submissions ← MISSING
  5. Admin approves/rejects with feedback ← MISSING
  6. Admin tracks participant progress ← MISSING
  7. Admin analyzes challenge performance ← MISSING
  8. Admin iterates and improves challenges

  🚨 Business Impact of Missing Features:

  Operational Issues:

  - Submissions pile up without review mechanism
  - No participant engagement monitoring
  - Can't optimize challenges based on data
  - Manual point adjustments impossible

    Strategic Limitations:
  - Can't measure ROI of challenges
  - No insights for improving participant experience
  - Unable to identify and replicate successful patterns
  - Missing feedback loop for continuous improvement

    🎨 Integration Opportunities:

    These admin features would perfectly complement the participant improvements:
  - Submission reviews directly impact participant motivation
  - Participant analytics inform better challenge design
  - Performance metrics validate the enhanced UX investments

    The enhanced participant experience creates more data and activity that admins desperately need tools to manage and analyze
    effectively.

    Bottom Line: The participant experience is now complete, but the admin experience has a growing workflow debt that needs immediate
    attention to make the platform operationally viable for workspace administrators.

  Deep Analysis of Invite System Implementation

  Full Scope Assessment

  The invite system needs to handle two distinct flows:

1. Workspace invites - Allow admins to invite users to join their workspace with specific roles
2. Challenge invites - Enable direct enrollment in specific challenges via shareable links

  This requires coordination between:

- Database schema changes (InviteCode model)
- API layer (creation, validation, acceptance)
- Email system integration (templates, sending)
- Frontend UI (creation forms, acceptance flows)
- Deep-linking routes for seamless onboarding

  Approach Options

  Option A: Unified Invite Model
- Single InviteCode table handles both workspace and challenge invites
- Type field distinguishes between workspace/challenge
- Simpler schema but requires conditional logic

  Option B: Separate Models
- WorkspaceInvite and ChallengeInvite as distinct models
- Cleaner separation but more code duplication

  Option C: Polymorphic Invites (Recommended)
- InviteCode with optional challengeId field
- If challengeId is null, it's a workspace invite
- If challengeId is present, auto-enroll in that challenge too
- Most flexible while maintaining simplicity

  Key Dependencies & Constraints
- Must integrate with existing Supabase auth flow
- Workspace isolation must be maintained
- Need to handle edge cases (expired codes, max uses reached)
- Email service must be configured (likely Resend or SendGrid)
- Deep links need to work for both authenticated and unauthenticated users

  Success Criteria
- Admins can generate and share invite codes
- Users can join via email links with one click
- System prevents abuse (expiry, usage limits)
- Proper error messages for all failure cases
- Zero security vulnerabilities (no workspace leakage)

  Deep Analysis of Invite System Implementation

  Full Scope Assessment

  The invite system needs to handle two distinct flows:

1. Workspace invites - Allow admins to invite users to join their workspace with specific roles
2. Challenge invites - Enable direct enrollment in specific challenges via shareable links

  This requires coordination between:

- Database schema changes (InviteCode model)
- API layer (creation, validation, acceptance)
- Email system integration (templates, sending)
- Frontend UI (creation forms, acceptance flows)
- Deep-linking routes for seamless onboarding

  Approach Options

  Option A: Unified Invite Model
- Single InviteCode table handles both workspace and challenge invites
- Type field distinguishes between workspace/challenge
- Simpler schema but requires conditional logic

  Option B: Separate Models
- WorkspaceInvite and ChallengeInvite as distinct models
- Cleaner separation but more code duplication

  Option C: Polymorphic Invites (Recommended)
- InviteCode with optional challengeId field
- If challengeId is null, it's a workspace invite
- If challengeId is present, auto-enroll in that challenge too
- Most flexible while maintaining simplicity

  Key Dependencies & Constraints
- Must integrate with existing Supabase auth flow
- Workspace isolation must be maintained
- Need to handle edge cases (expired codes, max uses reached)
- Email service must be configured (likely Resend or SendGrid)
- Deep links need to work for both authenticated and unauthenticated users

  Success Criteria
- Admins can generate and share invite codes
- Users can join via email links with one click
- System prevents abuse (expiry, usage limits)
- Proper error messages for all failure cases
- Zero security vulnerabilities (no workspace leakage)

  Reflection on Implementation Approach

  Major Phases of Work

1. Database & Core Logic Phase (Commits 1-2)
   - Schema migration
   - Query functions and type definitions
   - Core validation logic
2. API Layer Phase (Commits 3-4)
   - Create invite endpoint (admin)
   - Accept invite endpoint (public)
   - Error handling and validation
3. Frontend Integration Phase (Commits 5-6)
   - Admin UI for creating invites
   - Accept flow UI
   - Deep-link routing
4. Email Integration Phase (Commits 7-8)
   - Email templates
   - Sending logic
   - Link generation
5. Testing & Documentation Phase (Commits 9-10)
   - Integration tests
   - API documentation
   - Usage examples

  Critical Dependencies

- Schema must be migrated before any code changes
- Query functions needed before API endpoints
- API endpoints required before frontend
- Email service config needed for email phase

  Potential Bottlenecks
- Code generation in invite creation (needs to be unique and secure)
- Race conditions in accepting invites (concurrent usage)
- Email service configuration and templates

  Reflection on Implementation Approach

  Major Phases of Work

1. Database & Core Logic Phase (Commits 1-2)
   - Schema migration
   - Query functions and type definitions
   - Core validation logic
2. API Layer Phase (Commits 3-4)
   - Create invite endpoint (admin)
   - Accept invite endpoint (public)
   - Error handling and validation
3. Frontend Integration Phase (Commits 5-6)
   - Admin UI for creating invites
   - Accept flow UI
   - Deep-link routing
4. Email Integration Phase (Commits 7-8)
   - Email templates
   - Sending logic
   - Link generation
5. Testing & Documentation Phase (Commits 9-10)
   - Integration tests
   - API documentation
   - Usage examples

  Critical Dependencies

- Schema must be migrated before any code changes
- Query functions needed before API endpoints
- API endpoints required before frontend
- Email service config needed for email phase

  Potential Bottlenecks
- Code generation in invite creation (needs to be unique and secure)
- Race conditions in accepting invites (concurrent usage)
- Email service configuration and templates

⏺ Strategic Validation

  Requirements Coverage Check

  ✅ Workspace invites - Covered with role assignment
  ✅ Challenge invites - Optional challengeId field enables this
  ✅ Email integration - Planned for commits 7-8
  ✅ Deep-linking - Will be in frontend phase
  ✅ Expiry & limits - Built into schema and query logic
  ✅ Idempotent operations - acceptInviteCode handles this

  Key Assumptions to Validate

- Using nanoid for code generation (need to add dependency)
- Email service already configured (Resend/SendGrid)
- Existing User model has relation support for InviteCode
- Frontend has toast/notification system for feedback

  First Concrete Actions

1. Add nanoid dependency to package.json
2. Update Prisma schema with InviteCode model
3. Run prisma generate and migrate

⏺ Complete Workspace Invite System Implementation Plan

  Overview

  A production-ready invite code system for workspace and challenge enrollment with email integration,
  enabling seamless onboarding through shareable links.

  Architecture Diagram

  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
  │   Admin UI      │─────>│  Create API     │─────>│   Database      │
  │  /admin/invites │      │ POST /invites   │      │  InviteCode     │
  └─────────────────┘      └─────────────────┘      └─────────────────┘
                                  │
                                  v
  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
  │  Email Service  │<─────│  Send Invite    │      │   Deep Link     │
  │  (Resend/SG)    │      │  POST /send     │      │  /invite/[code] │
  └─────────────────┘      └─────────────────┘      └─────────────────┘
                                                             │
                                                             v
  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
  │  User Joins     │<─────│  Accept API     │<─────│  Auto-Accept    │
  │  Workspace      │      │ POST /accept    │      │  on Page Load   │
  └─────────────────┘      └─────────────────┘      └─────────────────┘

  Implementation Phases

---

  PHASE 1: Database Foundation

  Commit 1: Schema Migration

  Purpose: Establish the InviteCode data model

  Files to modify:

- prisma/schema.prisma

  Implementation:
  model InviteCode {
  id          String    @id @default(uuid()) @db.Uuid
  code        String    @unique @default(nanoid(10))
  workspaceId String    @db.Uuid
  challengeId String?   @db.Uuid
  role        Role      @default(PARTICIPANT)
  expiresAt   DateTime
  maxUses     Int       @default(1)
  usedCount   Int       @default(0)
  createdBy   String    @db.Uuid
  createdAt   DateTime  @default(now())

  workspace   Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  challenge   Challenge? @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  creator     User       @relation("InviteCreator", fields: [createdBy], references: [id])

  @@index([code])
  @@index([workspaceId])
  }

  Post-commit actions:
- Run: pnpm prisma generate
- Run: pnpm prisma db push

---

  PHASE 2: Core Logic Layer

  Commit 2: Query Functions & Types

  Purpose: Implement business logic for invite operations

  Files to create/modify:

- lib/db/queries.ts
- lib/types.ts

  Core Functions:
  createInviteCode()     -> Generate secure code with nanoid
  getInviteByCode()      -> Retrieve invite with relations
  acceptInviteCode()     -> Idempotent user attachment
  incrementInviteUsage() -> Atomic usage counter
  getWorkspaceInvites()  -> List all workspace invites

  Validation Logic:
- Expiry checking: new Date() > invite.expiresAt
- Usage limits: invite.usedCount >= invite.maxUses
- Idempotency: Check existing workspace membership

---

  PHASE 3: API Endpoints

  Commit 3: Create Invite Endpoint

  Route: POST /api/workspaces/[slug]/invites

  Access Control: Admin only via requireWorkspaceAdmin()

  Request Schema:
  {
    role?: "ADMIN" | "PARTICIPANT"
    challengeId?: string (UUID)
    expiresIn?: number (1-720 hours)
    maxUses?: number (1-100)
  }

  Response:
  {
    invite: InviteCode
    link: "https://app.com/invite/CODE123"
  }

  Commit 4: Accept Invite Endpoint

  Route: POST /api/invites/accept

  Access Control: Authenticated users only

  Flow:

1. Validate code exists
2. Check expiry status
3. Verify usage limits
4. Attach user to workspace (idempotent)
5. Optionally enroll in challenge
6. Return redirect URL

  Error Responses:

- 401: Not authenticated -> Redirect to login
- 404: Invalid code
- 410: Expired or max uses reached

---

  PHASE 4: Frontend Integration

  Commit 5: Admin Management UI

  Route: /w/[slug]/admin/invites

  Features:
  ┌─────────────────────────────────────┐
  │  Create Invite                      │
  ├─────────────────────────────────────┤
  │  Role:        [PARTICIPANT  v]     │
  │  Expires In:  [24] hours           │
  │  Max Uses:    [1]                  │
  │                                     │
  │  [+ Create Invite]                 │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │  Active Invites                    │
  ├─────────────────────────────────────┤
  │  CODE123    0/5 used    [Copy]     │
  │  CODE456    3/10 used   [Copy]     │
  └─────────────────────────────────────┘

  Commit 6: Deep-link Acceptance Page

  Route: /invite/[code]

  User Flow:

1. User clicks invite link
2. Page auto-attempts acceptance
3. Three possible outcomes:

   a. Not Authenticated:
   -> Redirect to /auth/signin?callbackUrl=/invite/[code]

   b. Success:
   -> Show success message
   -> Auto-redirect to workspace after 3 seconds

   c. Error:
   -> Display error reason
   -> Provide return home button

---

  PHASE 5: Email & Testing

  Commit 7: Email Service Integration

  Email Template Structure:
  Subject: Invitation to [Workspace Name]

  You're invited to [Workspace Name]
  [Inviter] has invited you to join as a [role].

  [If challenge: You'll also be enrolled in: Challenge Title]

  [Accept Invite Button] -> Links to /invite/[code]

  Or copy this link: https://app.com/invite/[code]

  Send Flow:
  Admin creates invite -> Get invite link -> Send via email API

  Commit 8: Integration Tests

  Test Coverage:
  ┌─────────────────────────────────────┐
  │  Test Scenarios                     │
  ├─────────────────────────────────────┤
  │  ✓ Admin creates invite            │
  │  ✓ Valid invite acceptance         │
  │  ✓ Expired invite rejection        │
  │  ✓ Max uses enforcement            │
  │  ✓ Idempotent operations           │
  │  ✓ Auth redirect for logged out    │
  │  ✓ Challenge enrollment            │
  │  ✓ Workspace isolation             │
  └─────────────────────────────────────┘

---

  Deployment Checklist

  Pre-deployment Requirements

1. Dependencies
   - Add nanoid to package.json
   - Verify email service configured (Resend/SendGrid)
2. Environment Variables
   NEXT_PUBLIC_APP_URL=https://your-app.com
   EMAIL_API_KEY=your-email-service-key
3. Database Migration
   pnpm prisma generate
   pnpm prisma db push

  Security Considerations

- Workspace Isolation: All queries filtered by workspaceId
- Role Validation: Admin-only invite creation
- Input Validation: Zod schemas on all endpoints
- Rate Limiting: Consider adding to prevent abuse
- Code Generation: Cryptographically secure via nanoid

  Performance Optimizations
- Database indexes on code and workspaceId
- Minimal query operations (single transaction where possible)
- Idempotent operations prevent duplicate processing
- Efficient batch email sending

---

  Git Workflow

  Branch Strategy

  main
    └── feat/invite-system
         ├── Commit 1: Database schema
         ├── Commit 2: Core queries
         ├── Commit 3: Create API
         ├── Commit 4: Accept API
         ├── Commit 5: Admin UI
         ├── Commit 6: Deep-link route
         ├── Commit 7: Email integration
         └── Commit 8: Tests

  PR Structure

  Title: feat: Add workspace invite system

  Description:

- Implements secure invite code generation
- Supports workspace and challenge invites
- Email integration for sending invites
- Deep-link support for seamless onboarding
- Full test coverage

  Breaking Changes: None
  Migration Required: Yes (new database model)






⏺ Critical Gaps Analysis Complete: Participant Management System

  After deep analysis, here are the three showstopper issues that make the current participant
  management unusable in production:

  🔴 Showstopper #1: No Activity Tracking

  The Problem: The platform is completely blind to what participants actually DO. Without an Activity
  model, you have a user directory, not an engagement platform.

  Impact:

- Can't track participant progress
- Can't identify engaged vs. dormant users
- Can't measure challenge success
- Can't provide meaningful analytics

  The Fix: Add Activity model immediately:
  model Activity {
    id          String   @id @default(uuid())
    userId      String
    workspaceId String
    challengeId String?
    enrollmentId String?
    type        String   // "submission", "view", "complete", "comment"
    data        Json?
    points      Int      @default(0)
    createdAt   DateTime @default(now())

    user        User     @relation(fields: [userId], references: [id])
    workspace   Workspace @relation(fields: [workspaceId], references: [id])
  }

  🔴 Showstopper #2: No Bulk Operations

  The Problem: Every action is 1-by-1. Adding 50 participants = 50 manual operations = rage quit.

  Impact:

- Onboarding 30 participants takes hours
- Can't bulk assign to challenges
- Can't bulk update roles
- Platform fails at >10 users

  The Fix: Add bulk operations infrastructure:
  // New API: /api/workspaces/[slug]/participants/bulk
  POST /bulk
  {
    action: "invite" | "updateRole" | "enroll" | "import",
    participantIds?: string[],
    csvData?: string,
    challengeId?: string,
    role?: Role
  }

  🔴 Showstopper #3: No Self-Registration

  The Problem: Every participant needs admin hand-holding. The invite codes in your schema aren't even
  being used!

  Impact:

- Admin becomes bottleneck for every signup
- Can't share challenge links
- No viral growth possible
- Admin drowns in manual work

  The Fix: Implement invite code flow:
  // Enable the existing invite codes!
  // /app/invite/[code]/page.tsx
  const workspace = await getWorkspaceByInviteCode(code)
  // Let participants self-register with proper context

  The Brutal Truth

  Current State: You don't have a participant management system - you have a static contact list.

  Missing Foundation:

- No temporal awareness (when joined, last active, progression)
- No lifecycle tracking (invited → active → engaged → completed)
- No engagement visibility (what are they actually doing?)
- No operational scale (breaks at >10 users)

  Implementation Priority (Non-Negotiable Order)

  Phase 1: Activity Model (4-6 hours)

  Without this, nothing else matters. This enables progress tracking, engagement metrics, and analytics.

  Phase 2: Bulk Operations (6-8 hours)

  Makes the platform actually usable for real admins with real participant counts.

  Phase 3: Self-Service (3-4 hours)

  Removes admin bottleneck, enables viral growth.

  Phase 4: Enhanced UI (2-3 hours)

  Only AFTER the foundation - add filters, engagement metrics, progress bars.

  Total: ~20-25 hours to go from unusable prototype to viable MVP.

  What NOT to Build (Yet)

- ❌ Complex permissions (keep ADMIN/PARTICIPANT)
- ❌ Email templates (simple text is fine)
- ❌ Real-time updates (refresh works)
- ❌ Advanced analytics (basic counts only)
- ❌ Audit logging (add later)

  The Bottom Line

  Without these three foundational fixes, your participant management will fail immediately in
  production. The current system can't handle more than 10 participants without causing admin burnout.

  This isn't about missing features - it's about missing the fundamental infrastructure for an
  engagement platform.



PR [#1](https://github.com/alldigitalrewards/changemaker-minimal/pull/1): Database Schema Migration ⚡ LOW RISK

* Add WorkspaceMembership join table
* Keep existing workspaceId for backward compatibility
* Migrate existing data to membership records
* Time: 4-6 hours

PR [#2](https://github.com/alldigitalrewards/changemaker-minimal/pull/2): Core Query Layer ⚠️ MEDIUM RISK

* Add membership-based query functions
* Create backward compatibility wrappers
* Maintain existing API signatures
* Time: 8-10 hours

PR [#3](https://github.com/alldigitalrewards/changemaker-minimal/pull/3): Authentication Updates ⚠️ MEDIUM RISK

* Update middleware for membership checks
* Enhance workspace context providers
* Support dual access patterns
* Time: 6-8 hours


---
