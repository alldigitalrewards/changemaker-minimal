-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('INVITED', 'ENROLLED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('TEXT_SUBMISSION', 'FILE_UPLOAD', 'PHOTO_UPLOAD', 'LINK_SUBMISSION', 'MULTIPLE_CHOICE', 'VIDEO_SUBMISSION');

-- CreateEnum
CREATE TYPE "public"."SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DRAFT');

-- CreateEnum
CREATE TYPE "public"."ChallengeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ActivityEventType" AS ENUM ('INVITE_SENT', 'INVITE_REDEEMED', 'EMAIL_RESENT', 'ENROLLED', 'UNENROLLED', 'RBAC_ROLE_CHANGED', 'SUBMISSION_CREATED', 'SUBMISSION_APPROVED', 'SUBMISSION_REJECTED', 'CHALLENGE_CREATED', 'CHALLENGE_UPDATED', 'CHALLENGE_DUPLICATED', 'CHALLENGE_PUBLISHED', 'CHALLENGE_UNPUBLISHED', 'CHALLENGE_ARCHIVED', 'ACTIVITY_CREATED', 'ACTIVITY_UPDATED', 'BULK_UNENROLL');

-- CreateTable
CREATE TABLE "public"."Workspace" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "supabaseUserId" UUID,
    "role" "public"."Role" NOT NULL,
    "workspaceId" UUID,
    "primaryWorkspaceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Challenge" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "enrollmentDeadline" TIMESTAMP(3),
    "status" "public"."ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "workspaceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Enrollment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivityTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."ActivityType" NOT NULL,
    "basePoints" INTEGER NOT NULL DEFAULT 10,
    "workspaceId" UUID NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "pointsValue" INTEGER NOT NULL,
    "maxSubmissions" INTEGER NOT NULL DEFAULT 1,
    "deadline" TIMESTAMP(3),
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivitySubmission" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "textContent" TEXT,
    "fileUrls" TEXT[],
    "linkUrl" TEXT,
    "status" "public"."SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "pointsAwarded" INTEGER,
    "reviewNotes" TEXT,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PointsBalance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "availablePoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InviteCode" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "workspaceId" UUID NOT NULL,
    "challengeId" UUID,
    "role" "public"."Role" NOT NULL DEFAULT 'PARTICIPANT',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceMembership" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "role" "public"."Role" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivityEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "challengeId" UUID,
    "enrollmentId" UUID,
    "userId" UUID,
    "actorUserId" UUID,
    "type" "public"."ActivityEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "public"."Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "public"."User"("supabaseUserId");

-- CreateIndex
CREATE INDEX "User_workspaceId_idx" ON "public"."User"("workspaceId");

-- CreateIndex
CREATE INDEX "User_workspaceId_role_idx" ON "public"."User"("workspaceId", "role");

-- CreateIndex
CREATE INDEX "Challenge_workspaceId_idx" ON "public"."Challenge"("workspaceId");

-- CreateIndex
CREATE INDEX "Challenge_workspaceId_createdAt_idx" ON "public"."Challenge"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Challenge_workspaceId_startDate_idx" ON "public"."Challenge"("workspaceId", "startDate");

-- CreateIndex
CREATE INDEX "Challenge_workspaceId_status_idx" ON "public"."Challenge"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_userId_idx" ON "public"."Enrollment"("userId");

-- CreateIndex
CREATE INDEX "Enrollment_challengeId_idx" ON "public"."Enrollment"("challengeId");

-- CreateIndex
CREATE INDEX "Enrollment_status_idx" ON "public"."Enrollment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_challengeId_key" ON "public"."Enrollment"("userId", "challengeId");

-- CreateIndex
CREATE INDEX "ActivityTemplate_workspaceId_idx" ON "public"."ActivityTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "ActivityTemplate_workspaceId_type_idx" ON "public"."ActivityTemplate"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Activity_challengeId_idx" ON "public"."Activity"("challengeId");

-- CreateIndex
CREATE INDEX "Activity_templateId_idx" ON "public"."Activity"("templateId");

-- CreateIndex
CREATE INDEX "ActivitySubmission_activityId_idx" ON "public"."ActivitySubmission"("activityId");

-- CreateIndex
CREATE INDEX "ActivitySubmission_userId_idx" ON "public"."ActivitySubmission"("userId");

-- CreateIndex
CREATE INDEX "ActivitySubmission_enrollmentId_idx" ON "public"."ActivitySubmission"("enrollmentId");

-- CreateIndex
CREATE INDEX "ActivitySubmission_status_idx" ON "public"."ActivitySubmission"("status");

-- CreateIndex
CREATE INDEX "PointsBalance_workspaceId_idx" ON "public"."PointsBalance"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PointsBalance_userId_workspaceId_key" ON "public"."PointsBalance"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "public"."InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_code_idx" ON "public"."InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_workspaceId_idx" ON "public"."InviteCode"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_userId_idx" ON "public"."WorkspaceMembership"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_idx" ON "public"."WorkspaceMembership"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_userId_isPrimary_idx" ON "public"."WorkspaceMembership"("userId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_userId_workspaceId_key" ON "public"."WorkspaceMembership"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "ActivityEvent_workspaceId_createdAt_idx" ON "public"."ActivityEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_challengeId_createdAt_idx" ON "public"."ActivityEvent"("challengeId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_createdAt_idx" ON "public"."ActivityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_type_createdAt_idx" ON "public"."ActivityEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Challenge" ADD CONSTRAINT "Challenge_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityTemplate" ADD CONSTRAINT "ActivityTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."ActivityTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivitySubmission" ADD CONSTRAINT "ActivitySubmission_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivitySubmission" ADD CONSTRAINT "ActivitySubmission_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "public"."Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivitySubmission" ADD CONSTRAINT "ActivitySubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointsBalance" ADD CONSTRAINT "PointsBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointsBalance" ADD CONSTRAINT "PointsBalance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InviteCode" ADD CONSTRAINT "InviteCode_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InviteCode" ADD CONSTRAINT "InviteCode_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InviteCode" ADD CONSTRAINT "InviteCode_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityEvent" ADD CONSTRAINT "ActivityEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityEvent" ADD CONSTRAINT "ActivityEvent_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityEvent" ADD CONSTRAINT "ActivityEvent_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "public"."Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityEvent" ADD CONSTRAINT "ActivityEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
