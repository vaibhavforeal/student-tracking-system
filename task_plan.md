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
- [x] Student dashboard + personal stats
- [x] View own marks, attendance, profile

## ✨ Phase 4: Reports & AI Analytics
- [ ] CSV export for all report types
- [ ] PDF generation
- [ ] Gemini AI integration (performance trends, at-risk, comparisons)
- [ ] Analytics dashboard with charts

## 🛰️ Phase 5: Polish & Deployment
- [x] Final UI polish + responsive
- [x] Frontend production build — passes
- [x] Backend TypeScript check — passes
- [x] Full admin module visual verification (10 pages)
- [x] Code review of teacher + student modules
- [x] Bug fix: "Batchs" → "Batches" typo on Trash page
- [x] Bug fix: Case-insensitive email login (findUnique → findFirst with insensitive mode)
- [x] PM2 setup (`ecosystem.config.cjs`)
- [x] GitHub Actions CI/CD (`.github/workflows/ci.yml`)
- [x] `.env.example` template for collaborators
- [x] UAT — Admin (13 pages), Teacher (3 pages), Student (4 pages) — all pass
