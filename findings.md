# findings.md — Research, Discoveries & Constraints

> Updated after each meaningful research session or discovery.

---

## 📅 2026-03-19 — Session 1: Initialization + Discovery

### ✅ Discovery Answers (Confirmed)

| # | Question | Answer |
|---|----------|--------|
| Q1 | North Star | Web dashboard: admins = full access, teachers = marking & performance, students = view only |
| Q2 | Stack | React + Node.js + PostgreSQL + REST API. No Docker — use PM2 or cloud platforms |
| Q3 | Integrations | Gemini AI for student analytics. Local testing first, web deployment later |
| Q4 | Behavioral Rules | Reports exportable as CSV and PDF |

### 🏗️ Stack Decision

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + Vite + Vanilla CSS | User prefers white/sky-blue/purple theme; vanilla CSS per system guidelines |
| Backend | Node.js + Express | User specified Node.js from the structure tree |
| Database | PostgreSQL | Relational data with complex joins (batches → sections → students → marks) |
| ORM | Prisma | Type-safe, modern Node.js ORM with migration support |
| Auth | JWT (access + refresh tokens) | Self-hosted, no external auth provider needed |
| AI | Gemini API | Student performance analytics and trend analysis |
| API Style | REST | Standard CRUD endpoints, straightforward for this domain |
| Process Mgr | PM2 | Docker alternative for production process management |
| Dev Server | Backend: `localhost:5000`, Frontend: `localhost:5173` | Per gemini.md invariants |

### 📐 Architecture Notes
- **3 roles:** admin, teacher, student (no parent role in this rebuild)
- **Soft deletes** on all entities via `deleted_at` timestamp
- **UUID primary keys** on all tables
- All secrets in `.env`, never hardcoded
- Report generation: CSV via `json2csv`, PDF via `pdfkit` or `puppeteer`

---

## 📦 Resources to Research
> Will research GitHub repos and libraries during implementation planning.
