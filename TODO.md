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
