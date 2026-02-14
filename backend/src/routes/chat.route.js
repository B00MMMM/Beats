import { Router } from 'express';
import { getUsers, getMessages, sendMessage, getOnlineUsers, searchUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, getFriendRequests, removeFriend, createGroup, getMyGroups, getGroupById, getGroupMessages, sendGroupMessage, addGroupMember, removeGroupMember, promoteToAdmin, demoteAdmin, updateGroupName, updateGroupImage, leaveGroup, getAIConversation } from '../controller/chat.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

// Get all users for chat
router.get('/users', protectRoute, getUsers);

// Get messages with a specific user
router.get('/messages/:recipientId', protectRoute, getMessages);

// Send a message
router.post('/messages', protectRoute, sendMessage);

// Get AI conversation data
router.get('/ai-conversation/:conversationId/:messageId', protectRoute, getAIConversation);
router.get('/ai-conversation/:conversationId', protectRoute, getAIConversation);

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

// Group Management
router.post('/groups/:groupId/members', protectRoute, addGroupMember);
router.delete('/groups/:groupId/members/:memberId', protectRoute, removeGroupMember);
router.post('/groups/:groupId/admins/:memberId', protectRoute, promoteToAdmin);
router.delete('/groups/:groupId/admins/:memberId', protectRoute, demoteAdmin);
router.put('/groups/:groupId/name', protectRoute, updateGroupName);
router.put('/groups/:groupId/image', protectRoute, updateGroupImage);
router.post('/groups/:groupId/leave', protectRoute, leaveGroup);

export default router;


