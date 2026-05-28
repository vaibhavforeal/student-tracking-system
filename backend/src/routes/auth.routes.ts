import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;

    let user: any = null;

    if (role === 'student') {
      // ── Student login: enrollmentNo + DOB ──
      const { enrollmentNo, dob } = req.body;

      if (!enrollmentNo || !dob) {
        res.status(400).json({ error: 'Enrollment number and date of birth are required' });
        return;
      }

      // Find student by enrollment number
      const student = await prisma.student.findUnique({
        where: { enrollmentNo },
        select: {
          dob: true,
          userId: true,
          user: {
            select: {
              id: true, email: true, passwordHash: true,
              role: true, name: true, avatarUrl: true,
              isActive: true, deletedAt: true,
            },
          },
        },
      });

      if (!student || !student.user || student.user.deletedAt || !student.user.isActive) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Compare DOB — format submitted dob to match stored date
      const submittedDob = new Date(dob).toISOString().split('T')[0];
      const storedDob = new Date(student.dob).toISOString().split('T')[0];

      if (submittedDob !== storedDob) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      user = student.user;
    } else {
      // ── Teacher / Admin login: email + password ──
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: {
          id: true, email: true, passwordHash: true,
          role: true, name: true, avatarUrl: true,
          isActive: true, deletedAt: true,
        },
      });

      if (!user || user.deletedAt || !user.isActive) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
    }

    const tokenPayload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, email: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    const tokenPayload = { userId: user.id, role: user.role, email: user.email };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, role: true, name: true,
        avatarUrl: true, isActive: true, createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
