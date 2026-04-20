# 🎓 Student Tracking System (STS)

A full-stack web dashboard for managing students, teachers, and academic records. Admins have full access, teachers manage attendance & grading, and students can view their own data.

**Tech Stack:** React 19 · Vite · Express · Prisma · PostgreSQL

---

## Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org/) |
| **PostgreSQL** | 14+ | [postgresql.org](https://www.postgresql.org/download/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
# Using GitHub CLI
gh repo clone vaibhavforeal/student-tracking-system
cd student-tracking-system

# Or using Git
git clone https://github.com/vaibhavforeal/student-tracking-system.git
cd student-tracking-system
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Set Up PostgreSQL

Make sure PostgreSQL is running. Then create the database:

```bash
# Open psql shell (or use pgAdmin)
psql -U postgres

# Inside psql:
CREATE DATABASE sts_db;
\q
```

> **Note:** If your PostgreSQL runs on a different port or uses different credentials, adjust the `DATABASE_URL` in the next step accordingly.

### 4. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
# From the project root (STS/)
cp .env.example .env
```

Edit `.env` with your actual database credentials:

```env
# ─── Database ──────────────────────────────────────────
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sts_db"

# ─── JWT Secrets (change these!) ───────────────────────
JWT_SECRET=pick-a-strong-random-secret
JWT_REFRESH_SECRET=pick-another-strong-random-secret
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# ─── Server ───────────────────────────────────────────
PORT=5000
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# ─── Gemini AI (optional — for analytics module) ──────
GEMINI_API_KEY=your-gemini-api-key-here
```

> **Important:** The default PostgreSQL port is `5432`. If you configured it differently during installation, update the port in `DATABASE_URL`.

### 5. Set Up the Database Schema

```bash
cd backend

# Generate the Prisma client
npx prisma generate

# Run all migrations to create tables
npx prisma migrate deploy
```

### 6. Seed the Database (Optional but Recommended)

This creates a default admin account and sample data:

```bash
cd backend
npm run seed
```

Default admin credentials after seeding:
- **Email:** `admin@sts.com`
- **Password:** `admin123`

### 7. Start the Application

Open **two terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
Backend runs at: `http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## 📁 Project Structure

```
STS/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations/        # Migration history
│   ├── src/
│   │   ├── index.ts           # Express server entry point
│   │   ├── routes/            # API routes (admin, teacher, student, auth)
│   │   ├── middleware/        # Auth & error handling middleware
│   │   ├── utils/             # Helpers (password hashing, etc.)
│   │   └── seed.ts            # Database seeder
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Root component with routing
│   │   ├── pages/             # Page components per role
│   │   ├── components/        # Reusable UI components
│   │   ├── stores/            # Zustand state management
│   │   └── api/               # Axios API layer
│   └── package.json
├── .env.example               # Environment variable template
├── gemini.md                  # Project constitution & schema
└── README.md                  # ← You are here
```

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Admin** | Full CRUD on all entities — users, departments, batches, courses, students, staff |
| **Teacher** | Mark attendance, grade students, view assigned classes |
| **Student** | View own profile, marks, and attendance (read-only) |

---

## 🔧 Useful Commands

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | `backend/` | Start backend dev server |
| `npm run dev` | `frontend/` | Start frontend dev server |
| `npm run seed` | `backend/` | Seed database with sample data |
| `npm run build` | `backend/` | Compile TypeScript to JS |
| `npm run build` | `frontend/` | Build production frontend |
| `npx prisma studio` | `backend/` | Open Prisma visual DB browser |
| `npx prisma migrate dev` | `backend/` | Create & apply new migration |
| `npx prisma migrate deploy` | `backend/` | Apply pending migrations |

---

## 🔑 Troubleshooting

### "Connection refused" or database errors
- Ensure PostgreSQL is **running** on your machine
- Verify the port, username, and password in your `DATABASE_URL`
- Make sure the `sts_db` database exists

### "Module not found" errors
- Run `npm install` in **both** `backend/` and `frontend/` directories
- Run `npx prisma generate` in `backend/` to generate the Prisma client

### Port already in use
- Backend default: `5000` — change `PORT` in `.env`
- Frontend default: `5173` — run `npx vite --port 5174` to use a different port

---

## 📄 License

This project is for educational purposes.
