-- CreateTable: course_departments (join table for Course <-> Department with syllabus)
CREATE TABLE "course_departments" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "course_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: syllabus_units
CREATE TABLE "syllabus_units" (
    "id" TEXT NOT NULL,
    "course_department_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "hours" INTEGER,

    CONSTRAINT "syllabus_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable: syllabus_topics
CREATE TABLE "syllabus_topics" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "syllabus_topics_pkey" PRIMARY KEY ("id")
);

-- DataMigration: backfill course_departments from existing courses.department_id
INSERT INTO "course_departments" ("id", "course_id", "department_id", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    c."id",
    c."department_id",
    c."created_at",
    NOW()
FROM "courses" c
WHERE c."department_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_department_id_fkey";

-- AlterTable: drop department_id, add is_mandatory
ALTER TABLE "courses" DROP COLUMN "department_id";
ALTER TABLE "courses" ADD COLUMN "is_mandatory" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "course_departments_department_id_idx" ON "course_departments"("department_id");

-- CreateUnique
CREATE UNIQUE INDEX "course_departments_course_id_department_id_key" ON "course_departments"("course_id", "department_id");

-- CreateUnique
CREATE UNIQUE INDEX "syllabus_units_course_department_id_number_key" ON "syllabus_units"("course_department_id", "number");

-- CreateIndex
CREATE INDEX "syllabus_topics_unit_id_idx" ON "syllabus_topics"("unit_id");

-- AddForeignKey
ALTER TABLE "course_departments" ADD CONSTRAINT "course_departments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_departments" ADD CONSTRAINT "course_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_units" ADD CONSTRAINT "syllabus_units_course_department_id_fkey" FOREIGN KEY ("course_department_id") REFERENCES "course_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "syllabus_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
