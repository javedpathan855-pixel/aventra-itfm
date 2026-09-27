-- AlterTable
ALTER TABLE "invitation" ADD COLUMN     "tokenHash" TEXT;

-- CreateTable
CREATE TABLE "rate_limit_hit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_hit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_hit_key_createdAt_idx" ON "rate_limit_hit"("key", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_tokenHash_key" ON "invitation"("tokenHash");

