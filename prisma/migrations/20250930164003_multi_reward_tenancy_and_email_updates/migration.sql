/*
  Warnings:

  - A unique constraint covering the columns `[rewardIssuanceId]` on the table `ActivitySubmission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."RewardType" AS ENUM ('points', 'sku', 'monetary');

-- CreateEnum
CREATE TYPE "public"."RewardStatus" AS ENUM ('PENDING', 'ISSUED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."Activity" ADD COLUMN     "rewardRules" JSONB[] DEFAULT ARRAY[]::JSONB[];

-- AlterTable
ALTER TABLE "public"."ActivitySubmission" ADD COLUMN     "rewardIssuanceId" UUID,
ADD COLUMN     "rewardIssued" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Challenge" ADD COLUMN     "emailEditAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rewardConfig" JSONB,
ADD COLUMN     "rewardType" "public"."RewardType";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "emailChangePending" JSONB,
ADD COLUMN     "lastWorkspaceId" UUID,
ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "public"."Workspace" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT 'default';

-- CreateTable
CREATE TABLE "public"."RewardIssuance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "challengeId" UUID,
    "type" "public"."RewardType" NOT NULL,
    "amount" INTEGER,
    "currency" TEXT,
    "skuId" TEXT,
    "provider" TEXT,
    "status" "public"."RewardStatus" NOT NULL DEFAULT 'PENDING',
    "issuedAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,

    CONSTRAINT "RewardIssuance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TenantSku" (
    "id" UUID NOT NULL,
    "tenantId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantSku_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RewardIssuance_userId_idx" ON "public"."RewardIssuance"("userId");

-- CreateIndex
CREATE INDEX "RewardIssuance_workspaceId_idx" ON "public"."RewardIssuance"("workspaceId");

-- CreateIndex
CREATE INDEX "RewardIssuance_challengeId_idx" ON "public"."RewardIssuance"("challengeId");

-- CreateIndex
CREATE INDEX "RewardIssuance_status_idx" ON "public"."RewardIssuance"("status");

-- CreateIndex
CREATE INDEX "TenantSku_tenantId_idx" ON "public"."TenantSku"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSku_tenantId_skuId_key" ON "public"."TenantSku"("tenantId", "skuId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivitySubmission_rewardIssuanceId_key" ON "public"."ActivitySubmission"("rewardIssuanceId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "public"."User"("tenantId");

-- CreateIndex
CREATE INDEX "Workspace_tenantId_idx" ON "public"."Workspace"("tenantId");

-- AddForeignKey
ALTER TABLE "public"."ActivitySubmission" ADD CONSTRAINT "ActivitySubmission_rewardIssuanceId_fkey" FOREIGN KEY ("rewardIssuanceId") REFERENCES "public"."RewardIssuance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RewardIssuance" ADD CONSTRAINT "RewardIssuance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RewardIssuance" ADD CONSTRAINT "RewardIssuance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RewardIssuance" ADD CONSTRAINT "RewardIssuance_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
