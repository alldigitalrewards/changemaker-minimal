-- CreateTable
CREATE TABLE "public"."WorkspacePointsBudget" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "totalBudget" INTEGER NOT NULL DEFAULT 0,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspacePointsBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChallengePointsBudget" (
    "id" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "totalBudget" INTEGER NOT NULL DEFAULT 0,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengePointsBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PointsLedger" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "challengeId" UUID,
    "toUserId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "submissionId" UUID,
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePointsBudget_workspaceId_key" ON "public"."WorkspacePointsBudget"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengePointsBudget_challengeId_key" ON "public"."ChallengePointsBudget"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengePointsBudget_workspaceId_idx" ON "public"."ChallengePointsBudget"("workspaceId");

-- CreateIndex
CREATE INDEX "PointsLedger_workspaceId_createdAt_idx" ON "public"."PointsLedger"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PointsLedger_challengeId_createdAt_idx" ON "public"."PointsLedger"("challengeId", "createdAt");

-- CreateIndex
CREATE INDEX "PointsLedger_toUserId_createdAt_idx" ON "public"."PointsLedger"("toUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."WorkspacePointsBudget" ADD CONSTRAINT "WorkspacePointsBudget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkspacePointsBudget" ADD CONSTRAINT "WorkspacePointsBudget_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChallengePointsBudget" ADD CONSTRAINT "ChallengePointsBudget_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChallengePointsBudget" ADD CONSTRAINT "ChallengePointsBudget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChallengePointsBudget" ADD CONSTRAINT "ChallengePointsBudget_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointsLedger" ADD CONSTRAINT "PointsLedger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointsLedger" ADD CONSTRAINT "PointsLedger_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointsLedger" ADD CONSTRAINT "PointsLedger_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointsLedger" ADD CONSTRAINT "PointsLedger_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
