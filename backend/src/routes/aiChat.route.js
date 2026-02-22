import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { rateLimiter } from '../middleware/rateLimit.middleware.js';
import {
    getChatHistory,
    sendMessage,
    clearChatHistory,
    testAIConnection
} from '../controller/aiChat.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Get chat history
router.get('/history', getChatHistory);

// Send message to AI (rate limited)
router.post('/message', rateLimiter('aiMessage'), sendMessage);

// Clear chat history
router.delete('/clear', clearChatHistory);

// Test AI connection (for debugging)
router.get('/test', testAIConnection);

export default router;