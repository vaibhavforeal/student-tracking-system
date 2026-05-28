-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('enrolled', 'completed', 'dropped');

-- CreateTable
CREATE TABLE "skill_course_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_course_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "difficulty" "SkillLevel" NOT NULL,
    "duration" TEXT NOT NULL,
    "provider" TEXT,
    "link" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "skill_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_course_enrollments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill_course_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'enrolled',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "skill_course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_course_categories_name_key" ON "skill_course_categories"("name");

-- CreateIndex
CREATE INDEX "skill_courses_category_id_idx" ON "skill_courses"("category_id");

-- CreateIndex
CREATE INDEX "skill_course_enrollments_student_id_idx" ON "skill_course_enrollments"("student_id");

-- CreateIndex
CREATE INDEX "skill_course_enrollments_skill_course_id_idx" ON "skill_course_enrollments"("skill_course_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_course_enrollments_student_id_skill_course_id_key" ON "skill_course_enrollments"("student_id", "skill_course_id");

-- AddForeignKey
ALTER TABLE "skill_courses" ADD CONSTRAINT "skill_courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "skill_course_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_course_enrollments" ADD CONSTRAINT "skill_course_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_course_enrollments" ADD CONSTRAINT "skill_course_enrollments_skill_course_id_fkey" FOREIGN KEY ("skill_course_id") REFERENCES "skill_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
