-- CreateEnum
CREATE TYPE "StaffEducationLevel" AS ENUM ('bachelors', 'masters', 'mphil', 'phd', 'diploma', 'other');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('aadhaar', 'pan', 'passport', 'driving_license', 'voter_id', 'degree_certificate', 'experience_certificate', 'other');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('general', 'academics', 'infrastructure', 'faculty', 'suggestion', 'complaint', 'other');

-- AlterTable
ALTER TABLE "parents" ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "staff_personal_details" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "dob" DATE,
    "gender" "Gender",
    "blood_group" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "alternate_phone" TEXT,
    "joining_date" DATE,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,

    CONSTRAINT "staff_personal_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_education" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "level" "StaffEducationLevel" NOT NULL,
    "degree" TEXT NOT NULL,
    "specialization" TEXT,
    "institution" TEXT NOT NULL,
    "university" TEXT,
    "year_of_pass" INTEGER NOT NULL,
    "percentage" DECIMAL(65,30),
    "grade" TEXT,

    CONSTRAINT "staff_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_documents" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "document_number" TEXT,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_feedback" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" "FeedbackCategory" NOT NULL DEFAULT 'general',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "admin_reply" TEXT,
    "replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_personal_details_staff_id_key" ON "staff_personal_details"("staff_id");

-- CreateIndex
CREATE INDEX "staff_education_staff_id_idx" ON "staff_education"("staff_id");

-- CreateIndex
CREATE INDEX "staff_documents_staff_id_idx" ON "staff_documents"("staff_id");

-- CreateIndex
CREATE INDEX "student_feedback_student_id_idx" ON "student_feedback"("student_id");

-- CreateIndex
CREATE INDEX "student_feedback_is_read_idx" ON "student_feedback"("is_read");

-- CreateIndex
CREATE INDEX "student_feedback_created_at_idx" ON "student_feedback"("created_at");

-- AddForeignKey
ALTER TABLE "staff_personal_details" ADD CONSTRAINT "staff_personal_details_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_education" ADD CONSTRAINT "staff_education_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_documents" ADD CONSTRAINT "staff_documents_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_feedback" ADD CONSTRAINT "student_feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
