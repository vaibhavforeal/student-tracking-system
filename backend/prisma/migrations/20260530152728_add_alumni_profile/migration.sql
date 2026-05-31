-- CreateTable
CREATE TABLE "alumni_profiles" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "graduation_date" TIMESTAMP(3) NOT NULL,
    "graduation_year" INTEGER NOT NULL,
    "current_employer" TEXT,
    "current_job_title" TEXT,
    "linkedin_url" TEXT,
    "alumni_email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumni_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alumni_profiles_student_id_key" ON "alumni_profiles"("student_id");

-- AddForeignKey
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
