-- AlterTable
ALTER TABLE "public"."Challenge" ADD COLUMN     "requireAdminReapproval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireManagerApproval" BOOLEAN NOT NULL DEFAULT false;
