# Manager API Endpoints

**Last Updated**: October 20, 2025
**Status**: Implementation Ready
**Base URL**: `/api/workspaces/[slug]`

---

## Overview

This document describes all API endpoints related to the MANAGER role functionality, including manager assignment, submission review, and dashboard data access.

## Authentication

All endpoints require authentication via Supabase session cookie. Authorization is enforced through role-based access control (RBAC).

**Auth Helpers Used**:
- `requireAuth()` - Verifies valid session
- `requireWorkspaceAccess(slug)` - Verifies workspace membership
- `requireWorkspaceAdmin(slug)` - Requires ADMIN role
- `requireWorkspaceManager(slug)` - Requires MANAGER or ADMIN role
- `requireManagerAccess(slug, challengeId)` - Requires manager assignment to specific challenge

---

## Manager Assignment Endpoints

### POST /api/workspaces/[slug]/challenges/[id]/managers

Assign a manager to a challenge.

**Authorization**: Admin only (`requireWorkspaceAdmin`)

**Request Body**:
```typescript
{
  managerId: string  // UUID of user with MANAGER role
}
```

**Example**:
```bash
curl -X POST https://changemaker.im/api/workspaces/acme/challenges/abc-123/managers \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{
    "managerId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response** (200 OK):
```json
{
  "assignment": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "challengeId": "abc-123",
    "managerId": "550e8400-e29b-41d4-a716-446655440000",
    "workspaceId": "workspace-uuid",
    "assignedAt": "2025-10-20T14:30:00Z",
    "assignedBy": "admin-user-uuid",
    "Manager": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "manager@example.com",
      "firstName": "Jane",
      "lastName": "Manager"
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing managerId or invalid format
- `403 Forbidden`: User is not admin
- `404 Not Found`: Challenge or manager user not found
- `409 Conflict`: Manager already assigned to this challenge
- `422 Unprocessable Entity`: User does not have MANAGER role

**Implementation** (`app/api/workspaces/[slug]/challenges/[id]/managers/route.ts`):
```typescript
export async function POST(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  const { workspace, user } = await requireWorkspaceAdmin(params.slug)
  const { managerId } = await request.json()

  // Validate manager user exists and has MANAGER role
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    include: {
      WorkspaceMemberships: {
        where: { workspaceId: workspace.id }
      }
    }
  })

  if (!manager) {
    return NextResponse.json({ error: 'Manager not found' }, { status: 404 })
  }

  const membership = manager.WorkspaceMemberships[0]
  if (!membership || membership.role !== 'MANAGER') {
    return NextResponse.json(
      { error: 'User must have MANAGER role' },
      { status: 422 }
    )
  }

  // Create assignment
  const assignment = await assignChallengeManager(
    params.id,
    managerId,
    workspace.id,
    user.dbUser.id
  )

  // Send notification email
  await sendManagerAssignedEmail(manager.email, assignment)

  return NextResponse.json({ assignment })
}
```

---

### GET /api/workspaces/[slug]/challenges/[id]/managers

List all managers assigned to a challenge.

**Authorization**: Workspace access required (`requireWorkspaceAccess`)

**Query Parameters**: None

**Example**:
```bash
curl https://changemaker.im/api/workspaces/acme/challenges/abc-123/managers \
  -H "Cookie: sb-access-token=..."
```

**Response** (200 OK):
```json
{
  "managers": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "managerId": "550e8400-e29b-41d4-a716-446655440000",
      "assignedAt": "2025-10-20T14:30:00Z",
      "assignedBy": "admin-user-uuid",
      "Manager": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "manager@example.com",
        "firstName": "Jane",
        "lastName": "Manager"
      },
      "AssignedByUser": {
        "email": "admin@example.com",
        "firstName": "John",
        "lastName": "Admin"
      }
    }
  ]
}
```

**Implementation**:
```typescript
export async function GET(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  const { workspace } = await requireWorkspaceAccess(params.slug)

  const managers = await getChallengeManagers(params.id, workspace.id)

  return NextResponse.json({ managers })
}
```

---

### DELETE /api/workspaces/[slug]/challenges/[id]/managers/[managerId]

Remove a manager assignment from a challenge.

**Authorization**: Admin only (`requireWorkspaceAdmin`)

**Example**:
```bash
curl -X DELETE https://changemaker.im/api/workspaces/acme/challenges/abc-123/managers/550e8400-e29b-41d4-a716-446655440000 \
  -H "Cookie: sb-access-token=..."
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Manager removed from challenge"
}
```

**Error Responses**:
- `403 Forbidden`: User is not admin
- `404 Not Found`: Assignment not found

**Implementation**:
```typescript
export async function DELETE(
  request: Request,
  { params }: { params: { slug: string; id: string; managerId: string } }
) {
  const { workspace } = await requireWorkspaceAdmin(params.slug)

  // Find assignment
  const assignment = await prisma.challengeAssignment.findFirst({
    where: {
      challengeId: params.id,
      managerId: params.managerId,
      workspaceId: workspace.id
    }
  })

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  await removeChallengeManager(assignment.id, workspace.id)

  return NextResponse.json({
    success: true,
    message: 'Manager removed from challenge'
  })
}
```

---

## Manager Review Endpoints

### POST /api/workspaces/[slug]/submissions/[id]/manager-review

Manager reviews a submission (approve, reject, or request revision).

**Authorization**: Manager must be assigned to the submission's challenge (`requireManagerAccess`)

**Request Body**:
```typescript
{
  action: 'approve' | 'reject' | 'needs_revision',
  managerNotes: string,  // Required, review feedback
  pointsRecommendation?: number  // Optional, suggested points for admin
}
```

**Example**:
```bash
curl -X POST https://changemaker.im/api/workspaces/acme/submissions/sub-123/manager-review \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{
    "action": "approve",
    "managerNotes": "Great work! Photo clearly shows completion.",
    "pointsRecommendation": 100
  }'
```

**Response** (200 OK - Direct Approval):
```json
{
  "submission": {
    "id": "sub-123",
    "status": "APPROVED",
    "managerReviewedBy": "550e8400-e29b-41d4-a716-446655440000",
    "managerNotes": "Great work! Photo clearly shows completion.",
    "managerReviewedAt": "2025-10-20T15:00:00Z",
    "pointsAwarded": 100,
    "Activity": {
      "Challenge": {
        "requireAdminReapproval": false
      }
    }
  },
  "rewardIssued": true
}
```

**Response** (200 OK - Pending Admin Approval):
```json
{
  "submission": {
    "id": "sub-123",
    "status": "MANAGER_APPROVED",
    "managerReviewedBy": "550e8400-e29b-41d4-a716-446655440000",
    "managerNotes": "Good submission, recommend 100 points.",
    "managerReviewedAt": "2025-10-20T15:00:00Z",
    "Activity": {
      "Challenge": {
        "requireAdminReapproval": true
      }
    }
  },
  "adminNotified": true
}
```

**Response** (200 OK - Needs Revision):
```json
{
  "submission": {
    "id": "sub-123",
    "status": "NEEDS_REVISION",
    "managerReviewedBy": "550e8400-e29b-41d4-a716-446655440000",
    "managerNotes": "Photo is unclear. Please retake with better lighting.",
    "managerReviewedAt": "2025-10-20T15:00:00Z"
  },
  "participantNotified": true
}
```

**Error Responses**:
- `400 Bad Request`: Invalid action or missing managerNotes
- `403 Forbidden`: Manager not assigned to this challenge
- `404 Not Found`: Submission not found
- `409 Conflict`: Submission already reviewed (status not PENDING)

**Implementation**:
```typescript
export async function POST(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  // Get submission to check challenge
  const submission = await prisma.activitySubmission.findUnique({
    where: { id: params.id },
    include: {
      Activity: {
        include: { Challenge: true }
      }
    }
  })

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // Verify manager access to this challenge
  const { workspace, user } = await requireManagerAccess(
    params.slug,
    submission.Activity.challengeId
  )

  const { action, managerNotes, pointsRecommendation } = await request.json()

  if (!action || !managerNotes) {
    return NextResponse.json(
      { error: 'action and managerNotes are required' },
      { status: 400 }
    )
  }

  // Call manager review function
  const reviewed = await managerReviewSubmission(
    params.id,
    {
      action,
      managerNotes,
      managerId: user.dbUser.id,
      pointsRecommendation
    },
    workspace.id
  )

  // Send appropriate notification
  if (reviewed.status === 'APPROVED') {
    await sendSubmissionApprovedEmail(reviewed.User.email, reviewed)
    return NextResponse.json({
      submission: reviewed,
      rewardIssued: true
    })
  } else if (reviewed.status === 'MANAGER_APPROVED') {
    await sendAdminReapprovalEmail(workspace.id, reviewed)
    return NextResponse.json({
      submission: reviewed,
      adminNotified: true
    })
  } else if (reviewed.status === 'NEEDS_REVISION') {
    await sendSubmissionNeedsRevisionEmail(reviewed.User.email, reviewed)
    return NextResponse.json({
      submission: reviewed,
      participantNotified: true
    })
  }

  return NextResponse.json({ submission: reviewed })
}
```

---

### PATCH /api/workspaces/[slug]/submissions/[id]/review

Enhanced admin review endpoint (supports manager override).

**Authorization**: Admin only (`requireWorkspaceAdmin`)

**Request Body**:
```typescript
{
  status: 'APPROVED' | 'REJECTED',
  reviewNotes?: string,
  pointsAwarded?: number,
  reward?: {
    type: 'points' | 'sku' | 'monetary',
    amount?: number,
    currency?: string,
    skuId?: string
  }
}
```

**New Behavior**:
- If submission.status === 'MANAGER_APPROVED', logs ADMIN_OVERRIDE_MANAGER event
- Notifies manager if admin changes manager decision
- Records both decisions in ApprovalHistory

**Example** (Admin Override):
```bash
curl -X PATCH https://changemaker.im/api/workspaces/acme/submissions/sub-123/review \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{
    "status": "REJECTED",
    "reviewNotes": "Insufficient evidence of completion."
  }'
```

**Response** (200 OK):
```json
{
  "submission": {
    "id": "sub-123",
    "status": "REJECTED",
    "managerReviewedBy": "550e8400-e29b-41d4-a716-446655440000",
    "managerNotes": "Looks good to me.",
    "reviewedBy": "admin-user-uuid",
    "reviewNotes": "Insufficient evidence of completion.",
    "reviewedAt": "2025-10-20T16:00:00Z"
  },
  "override": true,
  "managerNotified": true
}
```

**Implementation Enhancement**:
```typescript
export async function PATCH(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  const { workspace, user } = await requireWorkspaceAdmin(params.slug)
  const { status, reviewNotes, pointsAwarded, reward } = await request.json()

  const submission = await prisma.activitySubmission.findUnique({
    where: { id: params.id },
    include: { ManagerReviewer: true }
  })

  // Check if overriding manager decision
  const isOverride = submission?.status === 'MANAGER_APPROVED'

  // Update submission
  const reviewed = await reviewActivitySubmission(
    params.id,
    {
      status,
      reviewedBy: user.dbUser.id,
      reviewNotes,
      pointsAwarded
    },
    workspace.id
  )

  if (isOverride) {
    // Log override event
    await logActivityEvent({
      type: 'ADMIN_OVERRIDE_MANAGER',
      userId: user.dbUser.id,
      workspaceId: workspace.id,
      metadata: {
        submissionId: params.id,
        managerDecision: submission.managerNotes,
        adminDecision: reviewNotes
      }
    })

    // Notify manager
    if (submission.ManagerReviewer) {
      await sendAdminOverrideEmail(submission.ManagerReviewer.email, reviewed)
    }
  }

  // Issue reward if approved
  if (status === 'APPROVED' && reward) {
    await issueReward({
      userId: reviewed.userId,
      workspaceId: workspace.id,
      challengeId: reviewed.Activity.challengeId,
      submissionId: reviewed.id,
      ...reward
    })
  }

  return NextResponse.json({
    submission: reviewed,
    override: isOverride,
    managerNotified: isOverride
  })
}
```

---

## Manager Dashboard Endpoints

### GET /api/workspaces/[slug]/manager/dashboard

Get manager dashboard data (stats and pending submissions).

**Authorization**: Manager or Admin (`requireWorkspaceManager`)

**Query Parameters**: None

**Example**:
```bash
curl https://changemaker.im/api/workspaces/acme/manager/dashboard \
  -H "Cookie: sb-access-token=..."
```

**Response** (200 OK):
```json
{
  "stats": {
    "assignedChallenges": 5,
    "pendingSubmissions": 12,
    "approvedThisWeek": 8,
    "averageReviewTimeHours": 4.5
  },
  "pendingSubmissions": [
    {
      "id": "sub-123",
      "status": "PENDING",
      "submittedAt": "2025-10-20T10:00:00Z",
      "User": {
        "firstName": "John",
        "lastName": "Participant",
        "email": "participant@example.com"
      },
      "Activity": {
        "title": "Complete training video",
        "Challenge": {
          "id": "challenge-123",
          "title": "Onboarding Challenge"
        }
      }
    }
  ],
  "assignedChallenges": [
    {
      "id": "challenge-123",
      "title": "Onboarding Challenge",
      "startDate": "2025-10-01T00:00:00Z",
      "endDate": "2025-10-31T23:59:59Z",
      "_count": {
        "Activity": 10
      },
      "pendingSubmissionsCount": 3
    }
  ]
}
```

**Implementation**:
```typescript
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { workspace, user } = await requireWorkspaceManager(params.slug)
  const managerId = user.dbUser.id

  // Get assigned challenges
  const assignedChallenges = await getManagerAssignments(managerId, workspace.id)

  // Get pending submissions for assigned challenges
  const pendingSubmissions = await getManagerPendingSubmissions(
    managerId,
    workspace.id
  )

  // Calculate stats
  const approvedThisWeek = await prisma.activitySubmission.count({
    where: {
      managerReviewedBy: managerId,
      status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
      managerReviewedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    }
  })

  const reviewTimes = await prisma.activitySubmission.findMany({
    where: {
      managerReviewedBy: managerId,
      managerReviewedAt: { not: null }
    },
    select: {
      submittedAt: true,
      managerReviewedAt: true
    }
  })

  const avgReviewTime = reviewTimes.reduce((sum, s) => {
    const diff = s.managerReviewedAt!.getTime() - s.submittedAt.getTime()
    return sum + diff
  }, 0) / reviewTimes.length / (1000 * 60 * 60) // Convert to hours

  return NextResponse.json({
    stats: {
      assignedChallenges: assignedChallenges.length,
      pendingSubmissions: pendingSubmissions.length,
      approvedThisWeek,
      averageReviewTimeHours: Math.round(avgReviewTime * 10) / 10
    },
    pendingSubmissions,
    assignedChallenges
  })
}
```

---

### GET /api/workspaces/[slug]/manager/challenges

List all challenges assigned to the current manager.

**Authorization**: Manager or Admin (`requireWorkspaceManager`)

**Query Parameters**: None

**Example**:
```bash
curl https://changemaker.im/api/workspaces/acme/manager/challenges \
  -H "Cookie: sb-access-token=..."
```

**Response** (200 OK):
```json
{
  "challenges": [
    {
      "id": "challenge-123",
      "title": "Onboarding Challenge",
      "description": "Complete all onboarding activities",
      "startDate": "2025-10-01T00:00:00Z",
      "endDate": "2025-10-31T23:59:59Z",
      "requireAdminReapproval": false,
      "_count": {
        "Activity": 10,
        "Enrollment": 45
      },
      "pendingSubmissionsCount": 3,
      "assignedAt": "2025-10-15T00:00:00Z"
    }
  ]
}
```

---

### GET /api/workspaces/[slug]/manager/challenges/[id]/submissions

List submissions for a specific challenge assigned to the manager.

**Authorization**: Manager must be assigned to this challenge (`requireManagerAccess`)

**Query Parameters**:
- `status` (optional): Filter by status (PENDING, MANAGER_APPROVED, NEEDS_REVISION, etc.)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example**:
```bash
curl "https://changemaker.im/api/workspaces/acme/manager/challenges/challenge-123/submissions?status=PENDING&page=1&limit=20" \
  -H "Cookie: sb-access-token=..."
```

**Response** (200 OK):
```json
{
  "submissions": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

## Error Handling

All endpoints follow consistent error response format:

**Error Response Structure**:
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    // Optional additional context
  }
}
```

**Common Error Codes**:
- `UNAUTHORIZED` (401): Not authenticated
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict (duplicate assignment)
- `UNPROCESSABLE_ENTITY` (422): Invalid data (wrong role, etc.)
- `INTERNAL_SERVER_ERROR` (500): Server error

---

## Rate Limiting

**Not implemented in initial release**. Future enhancement would add:
- 100 requests/minute per user for read endpoints
- 20 requests/minute per user for write endpoints
- 5 requests/minute per user for assignment operations

---

## Related Documentation

- [Manager Role Schema](../schema/manager-role.md) - Database schema
- [Manager Review Guide](../guides/manager-review-guide.md) - User guide
- [Manager Role Runbook](../deployment/manager-role-runbook.md) - Deployment procedures

---

## Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-10-20 | 1.0 | Initial API design | Claude Code |

---

*This document is maintained in `docs/api/manager-endpoints.md` and should be updated when API changes occur.*
