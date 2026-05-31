import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All notification routes require authentication
router.use(authenticate);

// ─── GET /api/notifications ──────────────────────────────────
// Fetch recent notifications and unread count for the current user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (err: any) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─── PUT /api/notifications/read-all ─────────────────────────
// Mark all notifications as read for the current user
router.put('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    console.error('Failed to mark all as read:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// ─── PUT /api/notifications/:id/read ──────────────────────────
// Mark a single notification as read
router.put('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id: id as string },
      data: { isRead: true },
    });

    res.json({ notification: updated });
  } catch (err: any) {
    console.error('Failed to mark notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ─── DELETE /api/notifications/:id ────────────────────────────
// Delete a single notification
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    await prisma.notification.delete({
      where: { id: id as string },
    });

    res.json({ success: true, message: 'Notification dismissed' });
  } catch (err: any) {
    console.error('Failed to dismiss notification:', err);
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

export default router;
