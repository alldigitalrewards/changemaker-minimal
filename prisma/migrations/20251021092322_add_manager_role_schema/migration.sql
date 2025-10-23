-- CreateEnum
CREATE TYPE "public"."CommunicationScope" AS ENUM ('WORKSPACE', 'CHALLENGE', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "public"."CommunicationAudience" AS ENUM ('ALL', 'ENROLLED', 'INVITED', 'COMPLETED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."ActivityEventType_new" AS ENUM ('INVITE_SENT', 'INVITE_REDEEMED', 'EMAIL_RESENT', 'ENROLLED', 'UNENROLLED', 'RBAC_ROLE_CHANGED', 'SUBMISSION_CREATED', 'SUBMISSION_APPROVED', 'SUBMISSION_REJECTED', 'CHALLENGE_CREATED', 'CHALLENGE_UPDATED', 'CHALLENGE_DUPLICATED', 'CHALLENGE_PUBLISHED', 'CHALLENGE_UNPUBLISHED', 'CHALLENGE_ARCHIVED', 'ACTIVITY_CREATED', 'ACTIVITY_UPDATED', 'BULK_UNENROLL');
ALTER TABLE "public"."ActivityEvent" ALTER COLUMN "type" TYPE "public"."ActivityEventType_new" USING ("type"::text::"public"."ActivityEventType_new");
ALTER TYPE "public"."ActivityEventType" RENAME TO "ActivityEventType_old";
ALTER TYPE "public"."ActivityEventType_new" RENAME TO "ActivityEventType";
DROP TYPE "public"."ActivityEventType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "public"."Role" ADD VALUE 'MANAGER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."SubmissionStatus" ADD VALUE 'MANAGER_APPROVED';
ALTER TYPE "public"."SubmissionStatus" ADD VALUE 'NEEDS_REVISION';

-- AlterTable
ALTER TABLE "public"."Activity" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."ActivityEvent" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "public"."ActivitySubmission" ADD COLUMN     "managerNotes" TEXT,
ADD COLUMN     "managerReviewedAt" TIMESTAMP(3),
ADD COLUMN     "managerReviewedBy" UUID;

-- AlterTable
ALTER TABLE "public"."ActivityTemplate" ADD COLUMN     "rewardConfig" JSONB,
ADD COLUMN     "rewardType" "public"."RewardType";

-- AlterTable
ALTER TABLE "public"."ChallengePointsBudget" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "public"."Enrollment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "public"."PointsLedger" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "public"."RewardIssuance" ADD COLUMN     "externalResponse" JSONB,
ADD COLUMN     "externalStatus" TEXT,
ADD COLUMN     "externalTransactionId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "public"."WorkspaceMembership" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."WorkspaceParticipantSegment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "public"."WorkspacePointsBudget" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- CreateTable
CREATE TABLE "public"."ChallengeAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "challengeId" UUID NOT NULL,
    "managerId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "assignedBy" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceMembershipPreferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "defaultRole" "public"."Role" NOT NULL DEFAULT 'PARTICIPANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMembershipPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceCommunication" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "challengeId" UUID,
    "activityId" UUID,
    "scope" "public"."CommunicationScope" NOT NULL,
    "audience" "public"."CommunicationAudience" NOT NULL DEFAULT 'ALL',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentBy" UUID NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChallengeAssignment_managerId_workspaceId_idx" ON "public"."ChallengeAssignment"("managerId", "workspaceId");

-- CreateIndex
CREATE INDEX "ChallengeAssignment_challengeId_idx" ON "public"."ChallengeAssignment"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeAssignment_workspaceId_idx" ON "public"."ChallengeAssignment"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeAssignment_challengeId_managerId_key" ON "public"."ChallengeAssignment"("challengeId", "managerId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembershipPreferences_userId_workspaceId_key" ON "public"."WorkspaceMembershipPreferences"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceCommunication_workspaceId_idx" ON "public"."WorkspaceCommunication"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceCommunication_challengeId_idx" ON "public"."WorkspaceCommunication"("challengeId");

-- CreateIndex
CREATE INDEX "WorkspaceCommunication_activityId_idx" ON "public"."WorkspaceCommunication"("activityId");

-- CreateIndex
CREATE INDEX "WorkspaceCommunication_sentBy_idx" ON "public"."WorkspaceCommunication"("sentBy");

-- CreateIndex
CREATE INDEX "WorkspaceCommunication_scope_audience_idx" ON "public"."WorkspaceCommunication"("scope", "audience");

-- CreateIndex
CREATE INDEX "Activity_challengeId_position_idx" ON "public"."Activity"("challengeId", "position");

-- AddForeignKey
ALTER TABLE "public"."ChallengeAssignment" ADD CONSTRAINT "ChallengeAssignment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChallengeAssignment" ADD CONSTRAINT "ChallengeAssignment_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChallengeAssignment" ADD CONSTRAINT "ChallengeAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChallengeAssignment" ADD CONSTRAINT "ChallengeAssignment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceMembershipPreferences" ADD CONSTRAINT "WorkspaceMembershipPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceMembershipPreferences" ADD CONSTRAINT "WorkspaceMembershipPreferences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceCommunication" ADD CONSTRAINT "WorkspaceCommunication_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceCommunication" ADD CONSTRAINT "WorkspaceCommunication_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceCommunication" ADD CONSTRAINT "WorkspaceCommunication_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceCommunication" ADD CONSTRAINT "WorkspaceCommunication_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
