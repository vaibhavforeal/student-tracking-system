-- ═══════════════════════════════════════════════════════════════
-- Pre-migration script: Attendance model update
-- Run this BEFORE `prisma migrate dev` if you have existing data.
-- Skip this if the database is fresh (no attendance rows).
-- ═══════════════════════════════════════════════════════════════

-- 1. Add the `period` column with default value 1
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "period" INT DEFAULT 1 NOT NULL;

-- 2. Rename `created_at` → `marked_at`
ALTER TABLE "attendance" RENAME COLUMN "created_at" TO "marked_at";

-- 3. Deduplicate: keep one row per (student, course, date, period), drop the rest.
--    Keeps the row with the latest marked_at; ties broken by id.
DELETE FROM "attendance"
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY "student_id", "course_id", "date", "period"
      ORDER BY "marked_at" DESC, id
    ) AS rn
    FROM "attendance"
  ) t WHERE rn > 1
);

-- 4. Drop old indexes that are being replaced
DROP INDEX IF EXISTS "attendance_student_id_course_id_idx";
DROP INDEX IF EXISTS "attendance_date_idx";

-- 5. Add the unique constraint (this will also serve as an index)
ALTER TABLE "attendance"
  ADD CONSTRAINT "attendance_student_id_course_id_date_period_key"
  UNIQUE ("student_id", "course_id", "date", "period");

-- 6. Verify: this should return 0 rows if dedup worked
SELECT "student_id", "course_id", "date", "period", COUNT(*)
FROM "attendance"
GROUP BY 1, 2, 3, 4
HAVING COUNT(*) > 1;
