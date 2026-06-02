# Graph Report - .  (2026-05-30)

## Corpus Check
- 91 files · ~77,951 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 344 nodes · 444 edges · 21 communities (14 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `Student Tracking System` - 13 edges
3. `useAuthStore` - 12 edges
4. `authenticate()` - 10 edges
5. `scripts` - 8 edges
6. `authorize()` - 7 edges
7. `config` - 5 edges
8. `scripts` - 5 edges
9. `authHeaders()` - 4 edges
10. `Role-Based Access Control` - 4 edges

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

## Communities (21 total, 7 thin omitted)

### Community 0 - "Backend Core & Routes"
Cohesion: 0.05
Nodes (34): authenticate(), authorize(), prisma, Request, errorHandler(), prisma, router, docStorage (+26 more)

### Community 1 - "Student Detail & Auth Pages"
Cohesion: 0.06
Nodes (22): ManageUsers(), StudentDetail(), Login(), ROLES, ProtectedRoute(), getPageTitle(), Navbar(), pageTitles (+14 more)

### Community 2 - "Analytics & Feedback Dashboard"
Cohesion: 0.05
Nodes (15): CHART_COLORS, PIE_COLORS, CATEGORIES, STATUS_TABS, reportTypes, BLOOD_GROUPS, DOCUMENT_TYPES, EDUCATION_LEVELS (+7 more)

### Community 3 - "Admin Entity Management"
Cohesion: 0.07
Nodes (6): EMPTY_FORM, DESIGNATION_OPTIONS, daysAgo(), daysLeft(), ENTITY_CONFIG, formatDeletedDate()

### Community 4 - "Frontend Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, axios, react, react-dom, react-icons, react-router-dom, recharts, zustand (+19 more)

### Community 5 - "Backend Dependencies"
Cohesion: 0.08
Nodes (25): description, devDependencies, prisma, ts-node, ts-node-dev, @types/bcryptjs, @types/cors, @types/express (+17 more)

### Community 6 - "Project Architecture & Design"
Cohesion: 0.10
Nodes (21): Academic Record Feature, Admin Role, AI-Powered Analytics (Gemini), Auto-Graduate Feature, CSV/PDF Report Generation, Student Data Privacy Policy, Project Constitution (gemini.md), Prisma ORM with PostgreSQL (+13 more)

### Community 7 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+11 more)

### Community 8 - "Backend Runtime Dependencies"
Cohesion: 0.12
Nodes (16): dependencies, axios, bcryptjs, cors, dotenv, express, form-data, @google/generative-ai (+8 more)

### Community 9 - "WhatsApp & Notifications"
Cohesion: 0.23
Nodes (12): prisma, router, CourseAttendance, generateAttendancePDF(), StudentAttendanceData, authHeaders(), formatPhoneNumber(), isWhatsAppConfigured() (+4 more)

### Community 10 - "Student Seed Data"
Cohesion: 0.28
Nodes (8): batchMap, parseDob(), parseName(), prisma, sectionMap, seedStudents(), StudentEntry, students

### Community 11 - "Staff Seed Data"
Cohesion: 0.40
Nodes (3): prisma, StaffEntry, staffList

## Knowledge Gaps
- **147 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Backend Runtime Dependencies` to `Backend Dependencies`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `authenticate()` connect `Backend Core & Routes` to `WhatsApp & Notifications`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Core & Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.05081967213114754 - nodes in this community are weakly interconnected._
- **Should `Student Detail & Auth Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06205673758865248 - nodes in this community are weakly interconnected._
- **Should `Analytics & Feedback Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `Admin Entity Management` be split into smaller, more focused modules?**
  _Cohesion score 0.06881720430107527 - nodes in this community are weakly interconnected._