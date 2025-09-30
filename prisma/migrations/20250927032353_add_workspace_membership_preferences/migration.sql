-- AlterTable (idempotent)
ALTER TABLE "public"."WorkspaceMembership" ADD COLUMN IF NOT EXISTS "preferences" JSONB;