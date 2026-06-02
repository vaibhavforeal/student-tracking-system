# 🎓 Student Tracking System — Design Document

> **Version:** 1.0  
> **Last Updated:** 2026-05-31  
> **Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Data Model](#data-model)
5. [API Design](#api-design)
6. [Authentication & Authorization](#authentication--authorization)
7. [Frontend Architecture](#frontend-architecture)
8. [Key Features](#key-features)
9. [UI / UX Design](#ui--ux-design)
10. [Deployment & Infrastructure](#deployment--infrastructure)
11. [Security Considerations](#security-considerations)
12. [Future Roadmap](#future-roadmap)

---

## Overview

The **Student Tracking System (STS)** is a full-stack web dashboard for managing students, teachers, and academic records at a college level. It implements role-based access control (RBAC) with three distinct user roles — **Admin**, **Teacher**, and **Student** — each with tailored views and permissions.

### Goals

- Centralize student data management (academic, personal, health, financial)
- Enable teachers to manage attendance and grading for assigned classes
- Give students a read-only portal for their own records
- Provide AI-powered analytics and reporting
- Support WhatsApp notifications to parents

---

## Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT                            │
│  React 19 + Vite · Zustand · React Router · Recharts    │
│  Port: 5173                                              │
└──────────────────┬───────────────────────────────────────┘
                   │  HTTP/REST (JSON)
                   │  Bearer JWT Auth
                   ▼
┌──────────────────────────────────────────────────────────┐
│                      API SERVER                          │
│  Express 4 · TypeScript · Helmet · Morgan · CORS         │
│  Port: 5000                                              │
├──────────────────────────────────────────────────────────┤
│  Middleware Layer                                         │
│  ├── authenticate (JWT verification)                     │
│  ├── authorize (role-based gates)                        │
│  └── errorHandler (global catch)                         │
├──────────────────────────────────────────────────────────┤
│  Route Layer                                             │
│  ├── /api/auth         (login, refresh, me)              │
│  ├── /api/admin        (full CRUD — all entities)        │
│  ├── /api/teacher      (attendance, marks, profile)      │
│  ├── /api/student      (read-only own data)              │
│  ├── /api/reports      (CSV / PDF generation)            │
│  ├── /api/ai           (Gemini-powered analytics)        │
│  ├── /api/whatsapp     (parent notifications)            │
│  ├── /api/academic     (academic records)                │
│  ├── /api/notifications(in-app notifications)            │
│  └── /api/verify       (barcode identity verification)   │
├──────────────────────────────────────────────────────────┤
│  Service Layer                                           │
│  ├── attendanceReport.generator.ts                       │
│  └── whatsapp.service.ts                                 │
└──────────────────┬───────────────────────────────────────┘
                   │  Prisma ORM
                   ▼
┌──────────────────────────────────────────────────────────┐
│                    PostgreSQL 14+                         │
│  Database: sts_db                                        │
│  UUID PKs · Soft Deletes · Indexed Queries               │
└──────────────────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
  ┌───────────┐      ┌──────────────┐
  │ Gemini AI │      │ WhatsApp API │
  │ Analytics │      │ Notifications│
  └───────────┘      └──────────────┘
```

### Data Flow

```
User Action (Browser)
    → Axios HTTP Request (with JWT in Authorization header)
    → Express Route Handler
    → Authentication Middleware (verify JWT, check user active)
    → Authorization Middleware (check role permissions)
    → Business Logic (Prisma queries, data transformations)
    → JSON Response
    → Axios Interceptor (auto-refresh on 401)
    → React Component State Update (via Zustand / local state)
    → UI Re-render
```

---

## Technology Stack

### Backend

| Technology          | Purpose                          | Version  |
|---------------------|----------------------------------|----------|
| **Node.js**         | Runtime                          | v18+     |
| **TypeScript**      | Type safety                      | ^5.8     |
| **Express**         | HTTP framework                   | ^4.21    |
| **Prisma**          | ORM & migrations                 | ^6.5     |
| **PostgreSQL**      | Relational database              | 14+      |
| **jsonwebtoken**    | JWT generation & verification    | ^9.0     |
| **bcryptjs**        | Password hashing                 | ^2.4     |
| **helmet**          | Security headers                 | ^8.0     |
| **morgan**          | Request logging                  | ^1.10    |
| **pdfkit**          | PDF report generation            | ^0.18    |
| **json2csv**        | CSV export                       | ^6.0     |
| **xlsx**            | Excel file parsing (bulk import) | ^0.18    |
| **@google/generative-ai** | Gemini API for AI analytics | ^0.24  |
| **axios**           | External API calls (WhatsApp)    | ^1.14    |
| **multer**          | File upload handling             | ^2.1     |

### Frontend

| Technology          | Purpose                          | Version  |
|---------------------|----------------------------------|----------|
| **React**           | UI framework                     | ^19.2    |
| **Vite**            | Build tool & dev server          | ^8.0     |
| **React Router**    | Client-side routing              | ^7.13    |
| **Zustand**         | Global state management          | ^5.0     |
| **Axios**           | HTTP client with interceptors    | ^1.13    |
| **Recharts**        | Data visualization / charts      | ^3.8     |
| **react-icons**     | Icon library                     | ^5.6     |
| **xlsx**            | Excel file handling (export)     | ^0.18    |

---

## Data Model

### Entity Relationship Overview

```
                    ┌────────────┐
                    │    User    │
                    │ (auth base)│
                    └──┬────┬───┘
                       │    │
            ┌──────────┘    └──────────┐
            ▼                          ▼
     ┌────────────┐             ┌───────────┐
     │   Staff    │             │  Student   │
     │ (teacher)  │             │            │
     └──┬──┬──┬───┘             └──┬──┬──┬──┬──┬──┬──┬───┐
        │  │  │                    │  │  │  │  │  │  │   │
        │  │  └─── StaffPersonal   │  │  │  │  │  │  │   │
        │  └────── StaffEducation  │  │  │  │  │  │  │   │
        └───────── StaffDocument   │  │  │  │  │  │  │   │
                                   │  │  │  │  │  │  │   │
        ┌──────────────────────────┘  │  │  │  │  │  │   │
        │  ┌──────────────────────────┘  │  │  │  │  │   │
        │  │  ┌──────────────────────────┘  │  │  │  │   │
        │  │  │  ┌──────────────────────────┘  │  │  │   │
        │  │  │  │  ┌──────────────────────────┘  │  │   │
        │  │  │  │  │  ┌──────────────────────────┘  │   │
        │  │  │  │  │  │  ┌──────────────────────────┘   │
        ▼  ▼  ▼  ▼  ▼  ▼  ▼                             ▼
     Health Skills Parents Aid PrevEd Hobbies Feedback  Alumni
```

### Core Entities (30 models, 18 enums)

#### Organizational Hierarchy
- **Department** → has many **Batches**
- **Batch** → has many **Sections** and **Students**
- **Section** → has many **Students** and **ClassAssignments**

#### Academic Structure
- **Course** → linked to departments via **CourseDepartment** (many-to-many)
- **CourseDepartment** → has many **SyllabusUnits** → each has **SyllabusTopics**
- **ClassAssignment** → binds a **Staff** to a **Course** + **Section** for an academic year
- **Mark** → assessment result for a student in a course
- **Attendance** → daily attendance record per student per course

#### People
- **User** → base auth entity (email, password, role)
- **Student** → extends User with enrollment details, linked to Batch & Section
- **Staff** → extends User with employee details, linked to Department

#### Student Sub-Entities
- **StudentHealth** → blood group, diseases, allergies, emergency contact
- **StudentSkill** → categorized skills with proficiency levels
- **Parent** → guardian info (can receive notifications)
- **FinancialAid** → scholarships & loans
- **PreviousEducation** → 10th/12th marks
- **StudentHobby** → hobbies and strengths
- **AlumniProfile** → post-graduation tracking

#### Staff Sub-Entities
- **StaffPersonalDetail** → personal info, health data
- **StaffEducation** → academic qualifications
- **StaffDocument** → uploaded documents (Aadhaar, PAN, etc.)

#### Engagement
- **SkillCourseCategory** → **SkillCourse** → **SkillCourseEnrollment** (student enrollment)
- **StudentFeedback** → feedback with admin reply capability
- **Notification** → in-app notification system
- **NotificationLog** → WhatsApp/email notification audit trail

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **UUID Primary Keys** | Prevents enumeration attacks; safe for distributed systems |
| **Soft Deletes (`deletedAt`)** | All entity deletions are reversible; 30-day trash with auto-purge |
| **Separate `User` from `Student`/`Staff`** | Clean separation of auth concerns from domain data |
| **`CourseDepartment` join table** | Courses can be shared across departments with per-dept syllabi |
| **JSON fields for health data** | Flexible arrays for diseases/allergies without extra join tables |
| **Indexed columns** | Strategic indexes on foreign keys and frequently queried fields |

---

## API Design

### Route Organization

All routes follow the pattern: `{METHOD} /api/{role-or-domain}/{resource}`

#### Auth Routes (`/api/auth`)

| Method | Endpoint        | Description              | Auth Required |
|--------|-----------------|--------------------------|---------------|
| POST   | `/login`        | Email/password login     | No            |
| POST   | `/refresh`      | Refresh access token     | No (refresh token) |
| GET    | `/me`           | Get current user profile | Yes           |

#### Admin Routes (`/api/admin`)

| Method | Endpoint                | Description                    |
|--------|-------------------------|--------------------------------|
| GET    | `/dashboard/stats`      | KPI cards (counts)             |
| CRUD   | `/departments`          | Department management          |
| CRUD   | `/batches`              | Batch management               |
| CRUD   | `/sections`             | Section management             |
| CRUD   | `/courses`              | Course management              |
| CRUD   | `/staff`                | Staff management               |
| CRUD   | `/students`             | Student management             |
| POST   | `/students/bulk-import` | Excel bulk import              |
| CRUD   | `/users`                | User account management        |
| CRUD   | `/assignments`          | Class assignment management    |
| CRUD   | `/skill-courses`        | Skill course management        |
| POST   | `/promote`              | Semester promotion             |
| CRUD   | `/feedback`             | Feedback management            |
| GET    | `/trash`                | Soft-deleted items             |
| POST   | `/trash/:model/:id/restore` | Restore deleted item      |

#### Teacher Routes (`/api/teacher`)

| Method | Endpoint             | Description                     |
|--------|----------------------|---------------------------------|
| GET    | `/classes`           | Assigned class-course combos    |
| GET    | `/students`          | Students in assigned sections   |
| POST   | `/attendance`        | Mark attendance (batch)         |
| POST   | `/marks`             | Enter/update marks              |
| GET    | `/profile`           | View own profile                |

#### Student Routes (`/api/student`)

| Method | Endpoint           | Description                      |
|--------|--------------------|----------------------------------|
| GET    | `/dashboard`       | Personal dashboard stats         |
| GET    | `/marks`           | Own marks by semester/course     |
| GET    | `/attendance`      | Own attendance records           |
| GET    | `/profile`         | Own profile information          |
| GET    | `/skill-courses`   | Available skill courses          |
| POST   | `/feedback`        | Submit feedback                  |

#### Report Routes (`/api/reports`)

| Method | Endpoint              | Description                     |
|--------|-----------------------|---------------------------------|
| GET    | `/attendance`         | Attendance report (CSV/PDF)     |
| GET    | `/marks`              | Marks report (CSV/PDF)          |
| GET    | `/student-performance`| Performance report              |
| GET    | `/batch-summary`      | Batch summary report            |

#### AI Routes (`/api/ai`)

| Method | Endpoint              | Description                     |
|--------|-----------------------|---------------------------------|
| POST   | `/analyze`            | AI-powered performance analysis |
| POST   | `/chat`               | AI assistant chat               |
| GET    | `/insights`           | Pre-computed insights           |

#### Integration Routes

| Method | Endpoint                   | Description                  |
|--------|----------------------------|------------------------------|
| POST   | `/api/whatsapp/send`       | Send WhatsApp notification   |
| GET    | `/api/notifications`       | List in-app notifications    |
| PATCH  | `/api/notifications/:id`   | Mark as read                 |
| GET    | `/api/verify/:enrollmentNo` | Verify student status/details by barcode |

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "email", "message": "Email is required" }
  ]
}
```

---

## Authentication & Authorization

### JWT Strategy (Dual Token)

```
┌─────────┐     POST /api/auth/login      ┌──────────┐
│  Client  │ ───────────────────────────── │  Server  │
│          │ ◄─── { accessToken,           │          │
│          │       refreshToken }           │          │
└─────────┘                                └──────────┘

Access Token:  Short-lived (15 min), sent in Authorization header
Refresh Token: Long-lived (7 days), used to obtain new access tokens
```

### Token Flow

1. **Login**: Client sends `{ email, password }` → Server returns `{ accessToken, refreshToken, user }`
2. **API Calls**: Client sends `Authorization: Bearer <accessToken>`
3. **Token Expired (401)**: Axios interceptor automatically calls `/api/auth/refresh` with `refreshToken`
4. **New Access Token**: Server validates refresh token → returns new `accessToken`
5. **Refresh Failed**: Redirect to `/login`

### Role-Based Access Control

```
                ┌──────────────┐
                │  authenticate│ ← Verify JWT, load user from DB
                └──────┬───────┘
                       │
                ┌──────▼───────┐
                │  authorize   │ ← Check user.role ∈ allowed roles
                └──────┬───────┘
                       │
                ┌──────▼───────┐
                │ Route Handler│ ← Execute business logic
                └──────────────┘
```

| Role      | Permissions                                                      |
|-----------|------------------------------------------------------------------|
| `admin`   | Full CRUD on all entities — departments, batches, courses, staff, students, users, reports, analytics, trash, feedback |
| `teacher` | Mark attendance, grade students, view assigned classes, view students in sections, export reports |
| `student` | View own profile, marks, attendance, submit feedback, enroll in skill courses (read-only for academic data) |

### Security Measures

- Password hashing with **bcrypt** (salt rounds: 10)
- JWT secret stored in environment variables (never hardcoded)
- Token payload contains only `{ userId, role }` — no sensitive data
- User `isActive` and `deletedAt` checked on every authenticated request
- Helmet middleware for security headers
- CORS restricted to configured origins

---

## Frontend Architecture

### Component Tree

```
<BrowserRouter>
└── <Routes>
    ├── /login                     → <Login />
    │
    ├── /admin/*                   → <ProtectedRoute roles={['admin']}>
    │   └── <DashboardLayout>
    │       ├── <Sidebar />        (role-based navigation)
    │       ├── <Navbar />         (page title, user info, notifications, theme toggle)
    │       └── <Outlet />         (page content)
    │           ├── index          → <AdminDashboard />
    │           ├── students       → <ManageStudents />
    │           ├── students/:id   → <StudentDetail />
    │           ├── alumni         → <AlumniDatabase />
    │           ├── staff          → <ManageStaff />
    │           ├── staff/:id      → <StaffDetail />
    │           ├── departments    → <ManageDepartments />
    │           ├── batches        → <ManageBatches />
    │           ├── sections       → <ManageSections />
    │           ├── courses        → <ManageCourses />
    │           ├── assignments    → <ManageAssignments />
    │           ├── users          → <ManageUsers />
    │           ├── reports        → <Reports />
    │           ├── analytics      → <Analytics />
    │           ├── trash          → <Trash />
    │           ├── skill-courses  → <ManageSkillCourses />
    │           ├── promotion      → <SemesterPromotion />
    │           ├── feedback       → <ManageFeedback />
    │           └── verify         → <VerifyStudent />
    │
    ├── /teacher/*                 → <ProtectedRoute roles={['teacher']}>
    │   └── <DashboardLayout>
    │       └── <Outlet />
    │           ├── index          → <TeacherDashboard />
    │           ├── students       → <ManageStudents /> (read-only view)
    │           ├── students/:id   → <StudentDetail />
    │           ├── attendance     → <TeacherAttendance />
    │           ├── marks          → <TeacherMarks />
    │           ├── profile        → <TeacherProfile />
    │           ├── reports        → <Reports />
    │           └── verify         → <VerifyStudent />
    │
    └── /student/*                 → <ProtectedRoute roles={['student']}>
        └── <DashboardLayout>
            └── <Outlet />
                ├── index          → <StudentDashboard />
                ├── marks          → <StudentMyMarks />
                ├── attendance     → <StudentMyAttendance />
                ├── profile        → <StudentProfile />
                ├── skill-courses  → <StudentSkillCourses />
                ├── academic       → <AcademicRecord />
                └── feedback       → <StudentFeedback />
```

### State Management

```
┌─────────────────────────────────────────────────┐
│               Zustand Store                      │
│                                                  │
│  authStore.js                                    │
│  ├── user: { id, email, name, role } | null      │
│  ├── token: string | null                        │
│  ├── login(user, token)                          │
│  └── logout()                                    │
│                                                  │
│  Persisted to localStorage                       │
└─────────────────────────────────────────────────┘
```

**Local component state** is used for page-specific data (fetched lists, form inputs, modals, filters, pagination) to keep the global store minimal.

### API Client

```
axios instance
├── baseURL: VITE_API_URL (env-based)
├── Request Interceptor:
│   └── Attach Authorization: Bearer <token> from authStore
├── Response Interceptor:
│   └── On 401 → attempt token refresh → retry request
│   └── On refresh failure → logout + redirect /login
└── Timeout: default
```

### Shared Components

| Component            | Purpose                                         |
|----------------------|-------------------------------------------------|
| `ProtectedRoute`     | Route guard — checks auth + role, redirects if unauthorized |
| `DashboardLayout`    | Sidebar + Navbar + content area (Outlet)        |
| `Sidebar`            | Navigation links filtered by user role          |
| `Navbar`             | Page header with user info, notifications, theme toggle |
| `ThemeToggle`        | Light/dark mode switch                          |
| `ConfirmDialog`      | Reusable confirmation modal                     |
| `AiAssistant`        | AI chat widget (Gemini-powered)                 |
| `SyllabusEditor`     | Rich syllabus unit/topic editor                 |

---

## Key Features

### 1. Student Management
- Full CRUD with search, pagination, and filters (batch, section, semester, status)
- **Bulk import** from Excel (`.xlsx`) with validation and error reporting
- Detailed student profile with tabbed sections:
  - Personal info, health, previous education
  - Parents/guardians, financial aid
  - Skills, hobbies, strengths
  - Academic record (marks + attendance)
- **Alumni tracking** with graduation info, employer, LinkedIn

### 2. Staff Management
- Staff profiles with personal details, qualifications, documents
- Document upload system (Aadhaar, PAN, certificates) via Multer
- Department assignment and class assignment tracking

### 3. Attendance System
- Teachers mark attendance per course-section-date combination
- Batch marking (present/absent/late for entire class)
- Attendance reports with percentage calculations
- PDF/CSV export capability

### 4. Grading System
- Multiple assessment types: internal, midterm, final, assignment, lab
- Per-student per-course marks entry with max marks
- Semester-wise and course-wise grade views
- Academic record page with cumulative performance

### 5. Syllabus Management
- Unit and topic editor linked to course-department combinations
- Drag-and-drop topic ordering
- Structured units with hour allocations

### 6. AI-Powered Analytics (Gemini)
- Performance trend analysis across batches
- At-risk student identification
- Class comparison insights
- Natural language AI assistant for data queries

### 7. Reports & Exports
- **Attendance reports** — per student, per course, per section
- **Marks reports** — semester-wise, course-wise
- **Batch summary** — aggregate statistics
- Export formats: **CSV** and **PDF**
- Automated PDF generation with PDFKit

### 8. Notifications
- **In-app notifications** — feedback responses, system alerts
- **WhatsApp notifications** — attendance reports to parents
- Notification history with read/unread status

### 9. Feedback System ("Space for Thought")
- Students submit categorized feedback (general, academics, infrastructure, faculty, etc.)
- Admin can read, archive, and reply to feedback
- Real-time notification on reply

### 10. Skill Enhancement Courses
- Admin manages course catalog with categories and difficulty levels
- Students browse and enroll in courses
- Enrollment tracking (enrolled → completed / dropped)

### 11. Semester Promotion
- Bulk semester promotion for students
- Configurable promotion criteria

### 12. Trash / Soft Delete
- All deleted items go to a 30-day trash
- Restore functionality from trash view
- **Auto-purge**: Background job (on server startup + every 24h) permanently deletes items older than 30 days

### 13. Barcode Identity Verification & PWA
- Code 128 barcode generation for all student enrollment numbers
- Printable single barcode strips or batch sheets for student ID cards
- Mobile-optimized camera barcode scanner using **quagga2**
- Secure read-only student verification profile lookup (restricted to `admin` & `teacher` roles)
- Progressive Web App (PWA) support with service worker and manifest for offline launch & installation

---

## UI / UX Design

### Design System

- **Theme**: White background with sky blue / purple gradient accents
- **Dark mode**: Supported via `ThemeToggle` component
- **Typography**: Clean, system-font stack
- **Design tokens**: Defined in `index.css` (600+ lines of custom CSS)

### Color Palette

| Token         | Light Mode         | Usage                    |
|---------------|--------------------|--------------------------|
| Primary       | Sky Blue (`#0ea5e9`)| Buttons, links, accents  |
| Secondary     | Purple (`#8b5cf6`) | Gradients, highlights    |
| Background    | White (`#ffffff`)  | Page backgrounds         |
| Surface       | Light gray         | Cards, panels            |
| Text          | Dark gray/black    | Body text                |
| Success       | Green              | Success states           |
| Warning       | Amber              | Warning states           |
| Danger        | Red                | Error states, delete     |

### Layout

```
┌─────────────────────────────────────────────────┐
│  Navbar (sticky top)                             │
│  [☰ Toggle]  Page Title        [🔔] [🌙] [👤]  │
├──────────┬──────────────────────────────────────┤
│          │                                       │
│ Sidebar  │         Main Content Area             │
│          │                                       │
│ Dashboard│    ┌────────────────────────────┐     │
│ Students │    │  Cards / Tables / Forms    │     │
│ Staff    │    │                            │     │
│ Courses  │    │  With search, filters,     │     │
│ ...      │    │  pagination, modals        │     │
│          │    └────────────────────────────┘     │
│          │                                       │
└──────────┴──────────────────────────────────────┘
```

### Responsive Behavior
- Sidebar collapses on mobile
- Tables become scrollable on small screens
- Forms stack vertically on narrow viewports

---

## Deployment & Infrastructure

### Development

```bash
# Backend (Terminal 1)
cd backend && npm run dev          # ts-node-dev, hot reload, port 5000

# Frontend (Terminal 2)
cd frontend && npm run dev         # Vite dev server, HMR, port 5173
```

### Production

```bash
# Backend
cd backend
npm run build                      # TypeScript → dist/
npm start                          # node dist/index.js

# Frontend
cd frontend
npm run build                      # Vite → dist/
                                   # Serve with Vercel, Nginx, etc.
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/sts_db"
DIRECT_URL="postgresql://user:pass@host:5432/sts_db"      # For Prisma (pooled vs direct)

# JWT
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Server
PORT=5000
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# AI (optional)
GEMINI_API_KEY=<gemini-api-key>

# WhatsApp (optional)
WHATSAPP_API_URL=<api-url>
WHATSAPP_API_TOKEN=<api-token>
```

### Process Management

- **PM2** recommended for production (`ecosystem.config.cjs` present at project root)
- Frontend deployed to **Vercel** (`vercel.json` configured for SPA rewrites)

### Database Management

| Command                       | Purpose                        |
|-------------------------------|--------------------------------|
| `npx prisma generate`        | Generate Prisma client         |
| `npx prisma migrate dev`     | Create & apply new migration   |
| `npx prisma migrate deploy`  | Apply pending migrations       |
| `npx prisma studio`          | Visual DB browser              |
| `npm run seed`               | Seed default admin + data      |

---

## Security Considerations

| Concern                 | Mitigation                                              |
|-------------------------|---------------------------------------------------------|
| SQL Injection           | Prisma ORM parameterized queries                        |
| XSS                     | React auto-escapes output; Helmet security headers      |
| CSRF                    | Token-based auth (no cookies); CORS origin whitelist    |
| Password Storage        | bcrypt with salt (never stored in plain text)           |
| Token Exposure          | Short-lived access tokens; refresh rotation             |
| Data Privacy            | Student health data restricted to admin/teacher roles   |
| File Uploads            | Multer with size limits; file type validation           |
| Secrets Management      | All secrets in `.env`; `.gitignore` excludes `.env`     |
| Enumeration Attacks     | UUID primary keys; generic error messages               |
| Brute Force             | Rate limiting recommended (not yet implemented)         |

---

## Future Roadmap

### Short Term
- [ ] Rate limiting on auth endpoints
- [ ] Email notification channel (in addition to WhatsApp)
- [ ] Student photo upload & management
- [ ] Batch-wise attendance analytics dashboard

### Medium Term
- [ ] Timetable / schedule management
- [ ] Library management integration
- [ ] Fee management module
- [ ] Parent portal (read-only access for guardians)
- [x] Mobile-responsive PWA support

### Long Term
- [ ] Mobile app (React Native)
- [ ] Multi-institution support (SaaS)
- [ ] Advanced AI: predictive dropout analysis, personalized learning paths
- [ ] Integration with LMS (Moodle, Google Classroom)
- [ ] Audit logging for all data mutations

---

## File Structure Reference

```
student-tracking-system-master/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # 30 models, 18 enums
│   │   └── migrations/               # Migration history
│   ├── src/
│   │   ├── index.ts                   # Express server entry + auto-purge
│   │   ├── config.ts                  # Environment variable loader
│   │   ├── middleware/
│   │   │   ├── auth.ts                # JWT authenticate + role authorize
│   │   │   └── errorHandler.ts        # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.routes.ts         # Login, refresh, me
│   │   │   ├── admin.routes.ts        # Full CRUD (110KB — largest file)
│   │   │   ├── teacher.routes.ts      # Attendance & marks
│   │   │   ├── student.routes.ts      # Read-only own data
│   │   │   ├── report.routes.ts       # CSV/PDF generation
│   │   │   ├── ai.routes.ts           # Gemini AI analytics
│   │   │   ├── whatsapp.routes.ts     # Parent notifications
│   │   │   ├── academic.routes.ts     # Academic records
│   │   │   ├── notification.routes.ts # In-app notifications
│   │   │   └── verify.routes.ts       # Barcode verification API
│   │   ├── services/
│   │   │   ├── attendanceReport.generator.ts
│   │   │   └── whatsapp.service.ts
│   │   ├── types/                     # TypeScript type definitions
│   │   ├── utils/                     # JWT, password, helpers
│   │   ├── seed.ts                    # Main seeder
│   │   ├── seed-staff.ts             # Staff data seeder
│   │   └── seed-students.ts          # Student data seeder
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Router with role-based routes
│   │   ├── main.jsx                   # React entry point
│   │   ├── index.css                  # Design system (61KB)
│   │   ├── api/
│   │   │   └── client.js             # Axios with JWT interceptors
│   │   ├── store/
│   │   │   └── authStore.js           # Zustand auth state
│   │   ├── components/
│   │   │   ├── guards/
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── ThemeToggle.jsx
│   │   │   ├── AiAssistant.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── SyllabusEditor.jsx
│   │   │   ├── BarcodeGenerator.jsx   # Renders Code 128 barcode
│   │   │   └── BarcodeScanner.jsx     # Mobile camera barcode scanner
│   │   └── pages/
│   │       ├── auth/
│   │       │   └── Login.jsx
│   │       ├── admin/                 # 20 pages
│   │       │   ├── Dashboard.jsx
│   │       │   ├── ManageStudents.jsx (41KB — largest page)
│   │       │   ├── StudentDetail.jsx
│   │       │   ├── AlumniDatabase.jsx
│   │       │   ├── ManageStaff.jsx
│   │       │   ├── StaffDetail.jsx
│   │       │   ├── ManageDepartments.jsx
│   │       │   ├── ManageBatches.jsx
│   │       │   ├── ManageSections.jsx
│   │       │   ├── ManageCourses.jsx
│   │       │   ├── ManageAssignments.jsx
│   │       │   ├── ManageUsers.jsx
│   │       │   ├── ManageSkillCourses.jsx
│   │       │   ├── ManageFeedback.jsx
│   │       │   ├── Reports.jsx
│   │       │   ├── Analytics.jsx
│   │       │   ├── Trash.jsx
│   │       │   ├── SemesterPromotion.jsx
│   │       │   ├── WhatsAppSend.jsx
│   │       │   └── NotificationHistory.jsx
│   │       ├── teacher/               # 4 pages
│   │       │   ├── Dashboard.jsx
│   │       │   ├── Attendance.jsx
│   │       │   ├── Marks.jsx
│   │       │   └── Profile.jsx
│   │       ├── student/               # 6 pages
│   │       │   ├── Dashboard.jsx
│   │       │   ├── MyMarks.jsx
│   │       │   ├── MyAttendance.jsx
│   │       │   ├── Profile.jsx
│   │       │   ├── SkillCourses.jsx
│   │       │   └── Feedback.jsx
│   │       └── shared/
│   │           ├── AcademicRecord.jsx
│   │           └── VerifyStudent.jsx
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
│   └── package.json
│
├── .env.example                       # Environment template
├── ecosystem.config.cjs              # PM2 configuration
├── gemini.md                          # Project constitution & schema
├── README.md                          # Setup guide
├── progress.md                        # Development log
├── task_plan.md                       # Task tracker
└── findings.md                        # Technical findings
```

---

*This document serves as the single source of truth for the STS architecture and design decisions. Update it when schema changes, features are added, or architectural decisions are modified.*
