# Graph Report - student-tracking-system-master  (2026-06-05)

## Corpus Check
- 101 files · ~148,161 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 609 nodes · 842 edges · 50 communities (41 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d1ae5f4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend Core & Routes|Backend Core & Routes]]
- [[_COMMUNITY_Student Detail & Auth Pages|Student Detail & Auth Pages]]
- [[_COMMUNITY_Analytics & Feedback Dashboard|Analytics & Feedback Dashboard]]
- [[_COMMUNITY_Admin Entity Management|Admin Entity Management]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Project Architecture & Design|Project Architecture & Design]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Backend Runtime Dependencies|Backend Runtime Dependencies]]
- [[_COMMUNITY_WhatsApp & Notifications|WhatsApp & Notifications]]
- [[_COMMUNITY_Student Seed Data|Student Seed Data]]
- [[_COMMUNITY_Staff Seed Data|Staff Seed Data]]
- [[_COMMUNITY_Teacher Attendance|Teacher Attendance]]
- [[_COMMUNITY_Database Seeding|Database Seeding]]
- [[_COMMUNITY_Data Validation|Data Validation]]
- [[_COMMUNITY_Vercel Deployment|Vercel Deployment]]
- [[_COMMUNITY_UI Branding & Theme|UI Branding & Theme]]
- [[_COMMUNITY_Project Findings|Project Findings]]
- [[_COMMUNITY_CICD Pipeline|CI/CD Pipeline]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]

## God Nodes (most connected - your core abstractions)
1. `PageHead()` - 20 edges
2. `compilerOptions` - 16 edges
3. `useAuthStore` - 15 edges
4. `🎓 Student Tracking System — Design Document` - 15 edges
5. `MiniAvatar()` - 14 edges
6. `Key Features` - 14 edges
7. `Student Tracking System` - 13 edges
8. `authenticate()` - 12 edges
9. `scripts` - 8 edges
10. `authorize()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Academic Record Feature` --semantically_similar_to--> `CSV/PDF Report Generation`  [INFERRED] [semantically similar]
  progress.md → gemini.md
- `UI Theme Design (Sky Blue / Purple)` --references--> `N.E.S. Institute Logo`  [INFERRED]
  gemini.md → frontend/public/logo.png
- `Student Tracking System` --implements--> `WhatsApp Notification System`  [INFERRED]
  gemini.md → progress.md
- `Progress Tracker` --references--> `Student Tracking System`  [EXTRACTED]
  progress.md → gemini.md
- `README Documentation` --references--> `Student Tracking System`  [EXTRACTED]
  README.md → gemini.md

## Hyperedges (group relationships)
- **Student Lifecycle Management** — student_status_lifecycle, semester_promotion_flow, auto_graduate_feature, soft_delete_pattern [INFERRED 0.85]
- **Role-Based Access System** — role_based_access, admin_role, teacher_role, student_role [EXTRACTED 1.00]

## Communities (50 total, 9 thin omitted)

### Community 0 - "Backend Core & Routes"
Cohesion: 0.05
Nodes (34): authenticate(), authorize(), prisma, Request, errorHandler(), prisma, router, levenshtein() (+26 more)

### Community 1 - "Student Detail & Auth Pages"
Cohesion: 0.05
Nodes (29): ManageUsers(), StudentDetail(), Login(), ROLES, ProtectedRoute(), DashboardLayout(), adminItems, GlobalSearch() (+21 more)

### Community 2 - "Analytics & Feedback Dashboard"
Cohesion: 0.18
Nodes (7): AVATAR_HUES, DEPT_HUE, deptColor(), deptHueKey(), DeptTag(), Meter(), StatTile()

### Community 3 - "Admin Entity Management"
Cohesion: 0.33
Nodes (6): Database Management, Deployment & Infrastructure, Development, Environment Variables, Process Management, Production

### Community 4 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, axios, @ericblade/quagga2, jsbarcode, lucide-react, react, react-dom, react-icons (+23 more)

### Community 5 - "Backend Dependencies"
Cohesion: 0.05
Nodes (42): dependencies, axios, bcryptjs, cors, dotenv, express, form-data, @google/generative-ai (+34 more)

### Community 6 - "Project Architecture & Design"
Cohesion: 0.10
Nodes (21): Academic Record Feature, Admin Role, AI-Powered Analytics (Gemini), Auto-Graduate Feature, CSV/PDF Report Generation, Student Data Privacy Policy, Project Constitution (gemini.md), Prisma ORM with PostgreSQL (+13 more)

### Community 7 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+11 more)

### Community 8 - "Backend Runtime Dependencies"
Cohesion: 0.17
Nodes (11): DESG_COLORS, DESIGNATION_OPTIONS, ManageStaff(), ManageStudents(), STATUS_TABS, ROLE_COLORS, ROLE_TABS, hueFor() (+3 more)

### Community 9 - "WhatsApp & Notifications"
Cohesion: 0.10
Nodes (22): bulkUpload, bulkUploadStorage, docStorage, docUpload, ParsedRow, prisma, router, storage (+14 more)

### Community 10 - "Student Seed Data"
Cohesion: 0.28
Nodes (8): batchMap, parseDob(), parseName(), prisma, sectionMap, seedStudents(), StudentEntry, students

### Community 11 - "Staff Seed Data"
Cohesion: 0.40
Nodes (3): prisma, StaffEntry, staffList

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (27): Academic Entities, AI Analysis (Gemini), 🏛️ Architectural Invariants, Attendance, Batches, 🧠 Behavioral Rules, Class Assignments, Core Entities (+19 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (18): 1. Clone the Repository, 2. Install Dependencies, 3. Set Up PostgreSQL, 4. Configure Environment Variables, 5. Set Up the Database Schema, 6. Seed the Database (Optional but Recommended), 7. Start the Application, "Connection refused" or database errors (+10 more)

### Community 23 - "Community 23"
Cohesion: 0.18
Nodes (10): Backend, Frontend, 🏗️ Phase 1: Foundation (Backend + Auth + Admin CRUD + Frontend), ⚡ Phase 2: Teacher Module, ⚙️ Phase 3: Student Module, ✨ Phase 4: Reports & AI Analytics, 🛰️ Phase 5: Polish & Deployment, 🟢 Protocol 0: Initialization (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.20
Nodes (3): BLOOD_GROUPS, DOCUMENT_TYPES, EDUCATION_LEVELS

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): 📅 2026-03-19 — Session 1: Protocol 0 + Phase 1 Build, 🔴 Blocked On, ✅ Completed, ❌ Errors, Phase 1 Backend (complete), Phase 1 Frontend (complete), progress.md — What Was Done, Errors, Tests, Results, Protocol 0: Initialization

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (6): 📅 2026-03-19 — Session 1: Initialization + Discovery, 📐 Architecture Notes, ✅ Discovery Answers (Confirmed), findings.md — Research, Discoveries & Constraints, 📦 Resources to Research, 🏗️ Stack Decision

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (9): Architecture, Data Flow, File Structure Reference, Goals, High-Level Architecture, Overview, Security Considerations, 🎓 Student Tracking System — Design Document (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.40
Nodes (5): API Client, Component Tree, Frontend Architecture, Shared Components, State Management

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (19): Analytics(), BAR_PALETTE, CHART_COLORS, MONTHS, PIE_COLORS, STATUS_COLORS, AdminDashboard(), ATTENDANCE_TREND (+11 more)

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (5): Authentication & Authorization, JWT Strategy (Dual Token), Role-Based Access Control, Security Measures, Token Flow

### Community 31 - "Community 31"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (3): MyMarks(), perfBadge(), typeLabel

### Community 33 - "Community 33"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (14): 10. Skill Enhancement Courses, 11. Semester Promotion, 12. Trash / Soft Delete, 13. Barcode Identity Verification & PWA, 1. Student Management, 2. Staff Management, 3. Attendance System, 4. Grading System (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.20
Nodes (10): Academic Structure, Core Entities (30 models, 18 enums), Data Model, Engagement, Entity Relationship Overview, Key Design Decisions, Organizational Hierarchy, People (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.20
Nodes (10): Admin Routes (`/api/admin`), AI Routes (`/api/ai`), API Design, Auth Routes (`/api/auth`), Error Response Format, Integration Routes, Report Routes (`/api/reports`), Route Organization (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.40
Nodes (5): Color Palette, Design System, Layout, Responsive Behavior, UI / UX Design

### Community 40 - "Community 40"
Cohesion: 0.50
Nodes (3): fs, mappings, path

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (5): client, failedQueue, CATEGORIES, statusStyles, ASSESSMENT_TYPES

### Community 43 - "Community 43"
Cohesion: 0.50
Nodes (4): Future Roadmap, Long Term, Medium Term, Short Term

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (3): Backend, Frontend, Technology Stack

### Community 46 - "Community 46"
Cohesion: 0.16
Nodes (5): CATEGORIES, STATUS_TABS, reportTypes, PageHead(), ICONS

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (3): DIFF_BADGE, DIFF_LABEL, levelMeta

### Community 49 - "Community 49"
Cohesion: 0.47
Nodes (4): daysAgo(), daysLeft(), ENTITY_CONFIG, formatDeletedDate()

## Knowledge Gaps
- **310 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+305 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `🎓 Student Tracking System — Design Document` connect `Community 27` to `Community 34`, `Admin Entity Management`, `Community 36`, `Community 37`, `Community 39`, `Community 43`, `Community 44`, `Community 28`, `Community 30`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Key Features` connect `Community 34` to `Community 27`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `PageHead()` connect `Community 46` to `Analytics & Feedback Dashboard`, `Community 38`, `Backend Runtime Dependencies`, `Community 47`, `Community 48`, `Community 49`, `Community 24`, `Community 29`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _321 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Core & Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.05493863237872589 - nodes in this community are weakly interconnected._
- **Should `Student Detail & Auth Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05319148936170213 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._