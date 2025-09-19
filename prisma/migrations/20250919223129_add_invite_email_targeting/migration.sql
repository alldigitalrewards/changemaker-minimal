-- AlterTable
ALTER TABLE "public"."InviteCode" ADD COLUMN     "targetEmail" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isPending" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."InviteRedemption" (
    "id" UUID NOT NULL,
    "inviteId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InviteRedemption_userId_idx" ON "public"."InviteRedemption"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteRedemption_inviteId_userId_key" ON "public"."InviteRedemption"("inviteId", "userId");

-- CreateIndex
CREATE INDEX "InviteCode_targetEmail_idx" ON "public"."InviteCode"("targetEmail");

-- AddForeignKey
ALTER TABLE "public"."InviteRedemption" ADD CONSTRAINT "InviteRedemption_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "public"."InviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InviteRedemption" ADD CONSTRAINT "InviteRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
