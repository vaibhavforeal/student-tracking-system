-- CreateIndex
CREATE INDEX "attendance_student_id_course_id_idx" ON "attendance"("student_id", "course_id");

-- CreateIndex
CREATE INDEX "attendance_course_id_date_idx" ON "attendance"("course_id", "date");

-- CreateIndex
CREATE INDEX "attendance_marked_by_idx" ON "attendance"("marked_by");

-- CreateIndex
CREATE INDEX "attendance_date_idx" ON "attendance"("date");

-- CreateIndex
CREATE INDEX "class_assignments_staff_id_idx" ON "class_assignments"("staff_id");

-- CreateIndex
CREATE INDEX "class_assignments_course_id_section_id_idx" ON "class_assignments"("course_id", "section_id");

-- CreateIndex
CREATE INDEX "marks_student_id_course_id_idx" ON "marks"("student_id", "course_id");

-- CreateIndex
CREATE INDEX "marks_course_id_semester_idx" ON "marks"("course_id", "semester");

-- CreateIndex
CREATE INDEX "marks_graded_by_idx" ON "marks"("graded_by");

-- CreateIndex
CREATE INDEX "marks_academic_year_idx" ON "marks"("academic_year");

-- CreateIndex
CREATE INDEX "students_batch_id_idx" ON "students"("batch_id");

-- CreateIndex
CREATE INDEX "students_section_id_idx" ON "students"("section_id");

-- CreateIndex
CREATE INDEX "students_semester_idx" ON "students"("semester");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");
