-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('sslc_10th', 'pu_12th');

-- CreateTable
CREATE TABLE "previous_education" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "level" "EducationLevel" NOT NULL,
    "institution" TEXT NOT NULL,
    "board" TEXT,
    "percentage" DECIMAL(65,30) NOT NULL,
    "year_of_pass" INTEGER NOT NULL,

    CONSTRAINT "previous_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_hobbies" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "student_hobbies_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "previous_education" ADD CONSTRAINT "previous_education_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_hobbies" ADD CONSTRAINT "student_hobbies_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
