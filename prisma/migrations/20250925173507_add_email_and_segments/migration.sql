-- CreateEnum
CREATE TYPE "public"."EmailTemplateType" AS ENUM ('INVITE', 'EMAIL_RESENT', 'ENROLLMENT_UPDATE', 'REMINDER', 'GENERIC');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ActivityEventType" ADD VALUE 'EMAIL_TEMPLATE_UPDATED';
ALTER TYPE "public"."ActivityEventType" ADD VALUE 'WORKSPACE_SETTINGS_UPDATED';
ALTER TYPE "public"."ActivityEventType" ADD VALUE 'PARTICIPANT_SEGMENT_CREATED';
ALTER TYPE "public"."ActivityEventType" ADD VALUE 'PARTICIPANT_SEGMENT_UPDATED';
ALTER TYPE "public"."ActivityEventType" ADD VALUE 'PARTICIPANT_SEGMENT_DELETED';

-- AlterTable
ALTER TABLE "public"."WorkspaceMembership" ADD COLUMN     "preferences" JSONB;

-- CreateTable
CREATE TABLE "public"."WorkspaceEmailSettings" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "replyTo" TEXT,
    "footerHtml" TEXT,
    "brandColor" TEXT,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceEmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceEmailTemplate" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "type" "public"."EmailTemplateType" NOT NULL,
    "subject" TEXT,
    "html" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkspaceParticipantSegment" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filterJson" JSONB,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceParticipantSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceEmailSettings_workspaceId_key" ON "public"."WorkspaceEmailSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceEmailTemplate_workspaceId_idx" ON "public"."WorkspaceEmailTemplate"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceEmailTemplate_workspaceId_type_key" ON "public"."WorkspaceEmailTemplate"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "WorkspaceParticipantSegment_workspaceId_idx" ON "public"."WorkspaceParticipantSegment"("workspaceId");

-- AddForeignKey
ALTER TABLE "public"."WorkspaceEmailSettings" ADD CONSTRAINT "WorkspaceEmailSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceEmailSettings" ADD CONSTRAINT "WorkspaceEmailSettings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceEmailTemplate" ADD CONSTRAINT "WorkspaceEmailTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceEmailTemplate" ADD CONSTRAINT "WorkspaceEmailTemplate_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceParticipantSegment" ADD CONSTRAINT "WorkspaceParticipantSegment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspaceParticipantSegment" ADD CONSTRAINT "WorkspaceParticipantSegment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
