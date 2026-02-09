import { Router } from 'express';
import { getUsers, getMessages, sendMessage, getOnlineUsers, searchUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, getFriendRequests, removeFriend, createGroup, getMyGroups, getGroupById, getGroupMessages, sendGroupMessage } from '../controller/chat.controller.js';
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

// Search users
router.get('/users/search', protectRoute, searchUsers);

// Friend requests
router.post('/friends/request', protectRoute, sendFriendRequest);
router.post('/friends/accept', protectRoute, acceptFriendRequest);
router.post('/friends/decline', protectRoute, declineFriendRequest);
router.get('/friends/requests', protectRoute, getFriendRequests);
router.post('/friends/remove', protectRoute, removeFriend);

// Groups
router.post('/groups', protectRoute, createGroup);
router.get('/groups', protectRoute, getMyGroups);
router.get('/groups/:id', protectRoute, getGroupById);
router.get('/groups/:groupId/messages', protectRoute, getGroupMessages);
router.post('/groups/messages', protectRoute, sendGroupMessage);

export default router;


