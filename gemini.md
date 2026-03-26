# gemini.md — Project Constitution
> **This file is law.** Do not modify unless a schema changes, a rule is added, or architecture is modified.

---

## 📌 Project Identity

- **Project Name:** Student Tracking System (STS)
- **North Star Goal:** A web dashboard where admins have overall access, teachers manage student marking & performance, and students have view access to their own data.
- **Last Updated:** 2026-03-19

---

## 🗃️ Data Schema (Input / Output)

### Core Entities

#### Users
```json
{
  "id": "uuid",
  "email": "string (unique)",
  "password_hash": "string",
  "role": "enum: admin | teacher | student",
  "name": "string",
  "avatar_url": "string | null",
  "is_active": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Departments
```json
{
  "id": "uuid",
  "name": "string",
  "code": "string (unique)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Batches
```json
{
  "id": "uuid",
  "name": "string",
  "department_id": "FK → departments.id",
  "degree": "string",
  "start_year": "integer",
  "end_year": "integer",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Sections
```json
{
  "id": "uuid",
  "name": "string",
  "batch_id": "FK → batches.id",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Courses
```json
{
  "id": "uuid",
  "code": "string (unique)",
  "name": "string",
  "credits": "integer",
  "semester": "integer",
  "type": "enum: theory | lab | elective",
  "department_id": "FK → departments.id",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Staff (Teachers)
```json
{
  "id": "uuid",
  "employee_id": "string (unique)",
  "user_id": "FK → users.id",
  "department_id": "FK → departments.id",
  "designation": "string",
  "phone": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Students
```json
{
  "id": "uuid",
  "enrollment_no": "string (unique)",
  "user_id": "FK → users.id",
  "first_name": "string",
  "last_name": "string",
  "dob": "date",
  "gender": "enum: male | female | other",
  "phone": "string",
  "address": "text",
  "batch_id": "FK → batches.id",
  "section_id": "FK → sections.id",
  "semester": "integer",
  "status": "enum: active | inactive | graduated | dropped",
  "photo_url": "string | null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Student Sub-Entities

#### Student Health
```json
{
  "id": "uuid",
  "student_id": "FK → students.id",
  "blood_group": "string",
  "diseases": "string[] (JSON)",
  "allergies": "string[] (JSON)",
  "emergency_contact_name": "string",
  "emergency_contact_phone": "string"
}
```

#### Student Skills
```json
{
  "id": "uuid",
  "student_id": "FK → students.id",
  "category": "string",
  "name": "string",
  "level": "enum: beginner | intermediate | advanced"
}
```

#### Parents
```json
{
  "id": "uuid",
  "student_id": "FK → students.id",
  "name": "string",
  "relation": "string",
  "phone": "string",
  "email": "string",
  "occupation": "string",
  "annual_income": "decimal | null"
}
```

#### Financial Aid
```json
{
  "id": "uuid",
  "student_id": "FK → students.id",
  "type": "enum: scholarship | loan",
  "amount": "decimal",
  "status": "enum: active | completed | cancelled",
  "academic_year": "string"
}
```

### Academic Entities

#### Class Assignments
```json
{
  "id": "uuid",
  "staff_id": "FK → staff.id",
  "course_id": "FK → courses.id",
  "section_id": "FK → sections.id",
  "academic_year": "string"
}
```

#### Marks / Assessments
```json
{
  "id": "uuid",
  "student_id": "FK → students.id",
  "course_id": "FK → courses.id",
  "assessment_type": "enum: internal | midterm | final | assignment | lab",
  "marks_obtained": "decimal",
  "max_marks": "decimal",
  "semester": "integer",
  "academic_year": "string",
  "graded_by": "FK → staff.id",
  "remarks": "text | null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Attendance
```json
{
  "id": "uuid",
  "student_id": "FK → students.id",
  "course_id": "FK → courses.id",
  "date": "date",
  "status": "enum: present | absent | late",
  "marked_by": "FK → staff.id",
  "created_at": "timestamp"
}
```

### Output Payloads

#### Reports (CSV / PDF)
```json
{
  "report_type": "enum: student_performance | attendance | marks | batch_summary",
  "filters": { "batch_id?": "", "section_id?": "", "course_id?": "", "semester?": "", "academic_year?": "" },
  "format": "enum: csv | pdf",
  "generated_at": "timestamp"
}
```

#### AI Analysis (Gemini)
```json
{
  "analysis_type": "enum: performance_trend | at_risk_students | class_comparison",
  "input_data": "aggregated student/marks/attendance data",
  "output": "string (AI-generated insights)",
  "generated_at": "timestamp"
}
```

---

## 🔌 Integrations

| Service | Purpose | Keys Ready? |
|---------|---------|-------------|
| PostgreSQL | Primary database | Local install |
| Gemini API | AI-powered student analytics | TBD |

---

## 🧠 Behavioral Rules

- **Role-based access:**
  - `admin` → full CRUD on all entities
  - `teacher` → mark attendance, grade students, view assigned classes
  - `student` → view own profile, marks, attendance only
- **Reports must be exportable as CSV and PDF.**
- **No Docker.** Use direct local execution for dev; PM2 or cloud platforms for production.
- **UI theme:** White background, sky blue / purple gradient accents.
- **Data privacy:** Student health data is accessible to admin and teacher roles only (not students).
- **Soft deletes:** All entity deletions are soft (set `deleted_at` timestamp).

---

## 🏛️ Architectural Invariants

- All environment variables/secrets live in `.env` — never hardcoded.
- All intermediate files go to `.tmp/` — not to root or `tools/`.
- `gemini.md` is updated **only** when: schema changes, rules are added, or architecture is modified.
- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:5173` (Vite)

---

## 🔁 Maintenance Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-19 | Initial constitution created | Gemini |
| 2026-03-19 | Full schema + rules defined after Discovery Q&A | Gemini |
