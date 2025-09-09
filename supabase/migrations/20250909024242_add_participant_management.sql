-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'PARTICIPANT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('INVITED', 'ENROLLED', 'WITHDRAWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable Workspace (if not exists)
CREATE TABLE IF NOT EXISTS "public"."Workspace" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable User (if not exists)
CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "supabaseUserId" UUID,
    "role" "public"."Role" NOT NULL,
    "workspaceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable Challenge (if not exists)
CREATE TABLE IF NOT EXISTS "public"."Challenge" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "enrollmentDeadline" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable Enrollment (if not exists)
CREATE TABLE IF NOT EXISTS "public"."Enrollment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_slug_key" ON "public"."Workspace"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "public"."User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseUserId_key" ON "public"."User"("supabaseUserId");
CREATE INDEX IF NOT EXISTS "User_workspaceId_idx" ON "public"."User"("workspaceId");
CREATE INDEX IF NOT EXISTS "User_workspaceId_role_idx" ON "public"."User"("workspaceId", "role");
CREATE INDEX IF NOT EXISTS "Challenge_workspaceId_idx" ON "public"."Challenge"("workspaceId");
CREATE INDEX IF NOT EXISTS "Challenge_workspaceId_createdAt_idx" ON "public"."Challenge"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "Challenge_workspaceId_startDate_idx" ON "public"."Challenge"("workspaceId", "startDate");
CREATE INDEX IF NOT EXISTS "Enrollment_userId_idx" ON "public"."Enrollment"("userId");
CREATE INDEX IF NOT EXISTS "Enrollment_challengeId_idx" ON "public"."Enrollment"("challengeId");
CREATE INDEX IF NOT EXISTS "Enrollment_status_idx" ON "public"."Enrollment"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_userId_challengeId_key" ON "public"."Enrollment"("userId", "challengeId");

-- AddForeignKey (if not exists)
DO $$ BEGIN
    ALTER TABLE "public"."User" ADD CONSTRAINT "User_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."Challenge" ADD CONSTRAINT "Challenge_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_challengeId_fkey" 
    FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;