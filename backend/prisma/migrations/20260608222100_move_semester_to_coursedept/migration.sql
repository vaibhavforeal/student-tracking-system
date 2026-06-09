-- DropForeignKey
ALTER TABLE "notification_logs" DROP CONSTRAINT IF EXISTS "notification_logs_parent_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "attendance_date_idx";

-- DropIndex
DROP INDEX IF EXISTS "attendance_student_id_course_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "course_departments_course_id_department_id_key";

-- AlterTable
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "created_at";
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "period" INTEGER NOT NULL DEFAULT 1;

-- AlterTable course_departments - add as nullable first
ALTER TABLE "course_departments" ADD COLUMN IF NOT EXISTS "semester" INTEGER;

-- Copy semester data from courses to course_departments
UPDATE "course_departments" cd
SET "semester" = c.semester
FROM "courses" c
WHERE cd."course_id" = c.id;

-- Provide fallback for safety (if any rows ended up null)
UPDATE "course_departments" SET "semester" = 1 WHERE "semester" IS NULL;

-- Alter to NOT NULL
ALTER TABLE "course_departments" ALTER COLUMN "semester" SET NOT NULL;

-- AlterTable courses
ALTER TABLE "courses" DROP COLUMN IF EXISTS "semester";

-- AlterTable
ALTER TABLE "notification_logs" ALTER COLUMN "parent_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_student_id_course_id_date_period_key" ON "attendance"("student_id", "course_id", "date", "period");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "course_departments_course_id_department_id_semester_key" ON "course_departments"("course_id", "department_id", "semester");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sections_name_batch_id_key" ON "sections"("name", "batch_id");

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
