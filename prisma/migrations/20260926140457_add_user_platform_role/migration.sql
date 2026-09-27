/*
  Warnings:

  - You are about to drop the `rate_limit_hit` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "platformRole" TEXT;

-- DropTable
DROP TABLE "rate_limit_hit";
