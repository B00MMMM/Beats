import { Router } from 'express';
import { getNotifications, getUnreadCount, markAsRead, deleteNotification } from '../controller/notification.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

// Get all notifications
router.get('/', protectRoute, getNotifications);

// Get unread count
router.get('/unread-count', protectRoute, getUnreadCount);

// Mark notifications as read
router.post('/mark-read', protectRoute, markAsRead);

// Delete a notification
router.delete('/:notificationId', protectRoute, deleteNotification);

export default router;
