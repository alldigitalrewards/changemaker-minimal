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
  - [ ] Phase 4: Participant Submission Flow - Submission forms and file upload
  - [ ] Phase 5: Admin Review System - Review dashboard and approval
  - [ ] Phase 6: Basic Points System - Points calculation and tracking

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




  ✅ Successfully Implemented Phase 1 & 2 of the Activities Feature:

  Completed:

1. Database Schema - Added 4 new models (ActivityTemplate, Activity, ActivitySubmission, PointsBalance)
2. Admin Activity Templates Management - Full CRUD interface at /w/[slug]/admin/activity-templates
3. API Routes - Complete REST API for activity template operations
4. UI Components - ActivityTemplateCard, ActivityTemplateForm, and Switch components
5. Build Verification - Project builds successfully with no errors

  Key Features:

- 6 activity types supported (text, file, photo, link, video, multiple choice)
- Points configuration per activity
- Approval workflow settings
- Workspace-isolated templates
- Reusable across challenges

  Next Steps (Phase 3):

@ continue with Challenge Integration where we:

- Add Activities tab to challenge edit page
- Allow admins to assign activity templates to challenges
- Create Activity instances from templates
- Configure challenge-specific settings (points, deadlines, requirements)

  The foundation is solid and ready for the next phase of implementation.
