-- DropForeignKey
ALTER TABLE "staff" DROP CONSTRAINT "staff_department_id_fkey";

-- AlterTable
ALTER TABLE "staff" ALTER COLUMN "department_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
