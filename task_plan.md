# task_plan.md — STS Rebuild Checklist

---

## 🟢 Protocol 0: Initialization

- [x] Create `gemini.md` — Project Constitution
- [x] Create `task_plan.md` — This file
- [x] Create `findings.md` — Research log
- [x] Create `progress.md` — Session log
- [x] Discovery Q&A — All 5 questions answered
- [x] Data Schema defined in `gemini.md` (15+ entities)
- [/] **Blueprint created — awaiting user approval**

---

## 🏗️ Phase 1: Foundation (Backend + Auth + Admin CRUD + Frontend)

### Backend
- [ ] Initialize Node.js + TypeScript project
- [ ] Set up Prisma ORM + schema (all models)
- [ ] Run initial migration
- [ ] Express app: CORS, middleware, error handler
- [ ] Auth: login, refresh, JWT, RBAC middleware
- [ ] Admin routes: CRUD for all entities
- [ ] Seed script: default admin user

### Frontend
- [ ] Scaffold React + Vite
- [ ] Design system: `index.css` (white/sky-blue/purple theme)
- [ ] Axios client with JWT interceptors
- [ ] Zustand auth store
- [ ] Layout: Sidebar, Navbar, DashboardLayout
- [ ] Login page
- [ ] Admin Dashboard
- [ ] Admin CRUD pages: Students, Departments, Batches, Sections, Courses, Staff, Users

### Verification
- [ ] API tests (auth, CRUD, validation)
- [ ] Manual E2E: login → dashboard → CRUD flow

---

## ⚡ Phase 2: Teacher Module
- [ ] Teacher dashboard + assigned classes
- [ ] Attendance marking
- [ ] Student grading (assessments)
- [ ] Performance view

## ⚙️ Phase 3: Student Module
- [ ] Student dashboard + personal stats
- [ ] View own marks, attendance, profile

## ✨ Phase 4: Reports & AI Analytics
- [ ] CSV export for all report types
- [ ] PDF generation
- [ ] Gemini AI integration (performance trends, at-risk, comparisons)
- [ ] Analytics dashboard with charts

## 🛰️ Phase 5: Polish & Deployment
- [ ] PM2 setup
- [ ] GitHub Actions CI/CD
- [ ] Final UI polish + responsive
- [ ] UAT
