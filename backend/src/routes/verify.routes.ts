import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/verify/:enrollmentNo
 * Verify a student by scanning their barcode (Code 128 encodes enrollmentNo).
 * Returns a focused verification payload with status, personal info, and emergency contacts.
 * Accessible by: teacher, admin
 */
router.get(
  '/:enrollmentNo',
  authenticate,
  authorize('admin', 'teacher'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const enrollmentNo = req.params.enrollmentNo as string;

      const student = (await prisma.student.findUnique({
        where: { enrollmentNo },
        select: {
          id: true,
          enrollmentNo: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          status: true,
          gender: true,
          phone: true,
          semester: true,
          dob: true,
          createdAt: true,
          deletedAt: true,
          batch: {
            select: {
              name: true,
              degree: true,
              startYear: true,
              endYear: true,
              department: {
                select: { name: true },
              },
            },
          },
          section: {
            select: { name: true },
          },
          health: {
            select: {
              bloodGroup: true,
              emergencyContactName: true,
              emergencyContactPhone: true,
            },
          },
          parents: {
            select: {
              name: true,
              relation: true,
              phone: true,
            },
          },
        },
      })) as any;

      // Not found or soft-deleted
      if (!student || student.deletedAt) {
        res.status(404).json({
          verified: false,
          error: 'Student not found',
        });
        return;
      }

      // Build response (omit deletedAt from output)
      const { deletedAt, ...studentData } = student;

      res.json({
        verified: true,
        student: {
          ...studentData,
          department: student.batch?.department?.name || null,
        },
      });
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({
        verified: false,
        error: 'Internal server error',
      });
    }
  }
);

export default router;
