import { Router } from 'express';
import { getUsers, getMessages, sendMessage, getOnlineUsers } from '../controller/chat.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

// Get all users for chat
router.get('/users', protectRoute, getUsers);

// Get messages with a specific user
router.get('/messages/:recipientId', protectRoute, getMessages);

// Send a message
router.post('/messages', protectRoute, sendMessage);

// Get online users
router.get('/online', protectRoute, getOnlineUsers);

export default router;
