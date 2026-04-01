import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import teacherRoutes from './routes/teacher.routes';
import studentRoutes from './routes/student.routes';
import reportRoutes from './routes/report.routes';
import aiRoutes from './routes/ai.routes';

// ─── Auto-purge: permanently delete trash older than 30 days ───
const RETENTION_DAYS = 30;
const prisma = new PrismaClient();

async function purgeOldTrash() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  try {
    const models: Array<{ name: string; delegate: any }> = [
      { name: 'department', delegate: prisma.department },
      { name: 'batch', delegate: prisma.batch },
      { name: 'section', delegate: prisma.section },
      { name: 'course', delegate: prisma.course },
      { name: 'staff', delegate: prisma.staff },
      { name: 'student', delegate: prisma.student },
    ];

    for (const { name, delegate } of models) {
      const result = await delegate.deleteMany({
        where: { deletedAt: { not: null, lt: cutoff } },
      });
      if (result.count > 0) {
        console.log(`🗑️  Purged ${result.count} expired ${name}(s) from trash`);
      }
    }
  } catch (err) {
    console.error('❌ Trash auto-purge failed:', err);
  }
}

const app = express();

// ─── Middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(morgan('dev'));

// ─── Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────
app.listen(config.port, () => {
  console.log(`\n🚀 STS Backend running on http://localhost:${config.port}`);
  console.log(`📋 Health check: http://localhost:${config.port}/api/health\n`);

  // Run trash purge on startup, then every 24 hours
  purgeOldTrash();
  setInterval(purgeOldTrash, 24 * 60 * 60 * 1000);
});

export default app;
