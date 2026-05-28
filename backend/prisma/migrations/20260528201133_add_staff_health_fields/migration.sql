/*
  Warnings:

  - You are about to drop the column `annual_income` on the `parents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "parents" DROP COLUMN "annual_income";

-- AlterTable
ALTER TABLE "staff_personal_details" ADD COLUMN     "allergies" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "diseases" JSONB NOT NULL DEFAULT '[]';
