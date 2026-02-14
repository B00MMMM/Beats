import { Message } from '../models/message.model.js';
import { User } from '../models/user.model.js';
import { Group } from '../models/group.model.js';
import { GroupMessage } from '../models/groupMessage.model.js';
import { AIChatConversation } from '../models/aiChatConversation.model.js';
import { getAuth } from "@clerk/express";
import { createNotification } from './notification.controller.js';
import cloudinary from '../lib/cloudinary.js';
import { GeminiService } from '../lib/gemini.js';

// Helper function to check if message mentions @mizu
const containsMizuMention = (content) => {
  if (!content || typeof content !== 'string') return false;
  return content.toLowerCase().includes('@mizu');
};

// Deduplication: track recently processed @mizu message IDs to prevent double processing
const processedMizuMessages = new Set();
const MIZU_DEDUP_TTL = 30000; // 30 seconds

// Helper function to generate AI response for @mizu mentions
const handleMizuMention = async (originalMessage, chatContext, senderName, io, onlineUsers, isGroupChat = false, groupId = null) => {
  try {
    // Dedup check — skip if this message was already processed
    const msgId = String(originalMessage._id);
    if (processedMizuMessages.has(msgId)) {
      console.log('⏭️ Skipping duplicate @mizu processing for message:', msgId);
      return;
    }
    processedMizuMessages.add(msgId);
    setTimeout(() => processedMizuMessages.delete(msgId), MIZU_DEDUP_TTL);

    console.log('🤖 MIZU mention detected, generating AI response...');

    // Generate AI response
    const aiResult = await GeminiService.generateChatResponse(
      originalMessage.content,
      chatContext,
      senderName
    );

    if (!aiResult.success) {
      console.error('❌ AI response failed:', aiResult.error);
      return;
    }

    console.log('📝 AI response received');

    // Clean the response text and parse song recommendations
    const cleanResponse = GeminiService.cleanResponseText(aiResult.response);
    const songRecommendations = GeminiService.parseSongRecommendations(aiResult.response);

    console.log('🎵 Parsed', songRecommendations.length, 'song recommendations');

    // Store ONLY in AIChatConversation model (single source of truth)
    let aiConversation = await AIChatConversation.findOne({ userId: 'SYSTEM_AI' });
    if (!aiConversation) {
      aiConversation = new AIChatConversation({
        userId: 'SYSTEM_AI',
        messages: []
      });
    }

    // Add user message and AI response to conversation
    const userMessage = {
      role: 'user',
      content: originalMessage.content
    };

    // Enrich with Deezer data (IDs, covers, previews) so they are playable
    // Note: This is an async operation, so we do it before creating the message object
    const enrichedRecommendations = await GeminiService.enrichRecommendations(songRecommendations);

    const aiMessage = {
      role: 'assistant',
      content: cleanResponse,
      recommendations: enrichedRecommendations
    };

    aiConversation.messages.push(userMessage, aiMessage);
    await aiConversation.save();

    console.log('💾 AI conversation saved with ID:', aiConversation._id);

    // Also save AI message to regular Message/GroupMessage table for persistence
    const persistedAIMessage = {
      senderId: 'MIZU_AI',
      senderName: 'MIZU',
      senderAvatar: null,
      content: cleanResponse,
      content: cleanResponse,
      // Store song recommendations as JSON string in content for retrieval
      songRecommendations: JSON.stringify(enrichedRecommendations)
    };

    // Create AI message for real-time display
    const realtimeAIMessage = {
      _id: `ai_${Date.now()}`, // Temporary ID for frontend
      senderId: 'MIZU_AI',
      senderName: 'MIZU',
      senderAvatar: null,
      content: cleanResponse,
      songRecommendations: enrichedRecommendations,
      isAI: true,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Send AI response to relevant users via socket AND save to database for persistence
    if (isGroupChat && groupId) {
      // Save AI message to GroupMessage table for persistence
      const savedGroupMessage = new GroupMessage({
        groupId: groupId,
        senderId: 'MIZU_AI',
        senderName: 'MIZU',
        senderAvatar: null,
        content: cleanResponse,
        songRecommendations: enrichedRecommendations,
        isAI: true
      });
      await savedGroupMessage.save();
      console.log('💾 AI message saved to GroupMessage:', savedGroupMessage._id);

      // Add songRecommendations for real-time display
      const groupAIMessage = {
        ...savedGroupMessage.toObject(),
        songRecommendations: enrichedRecommendations,
        isAI: true
      };

      // Send to all online group members
      const group = await Group.findById(groupId);
      if (group) {
        for (const member of group.members) {
          const memberUser = await User.findById(member);
          if (memberUser) {
            const memberSocketId = onlineUsers.get(memberUser.clerkId);
            if (memberSocketId) {
              console.log(`📤 Sending AI group message to ${memberUser.fullName}`);
              io.to(memberSocketId).emit('newGroupMessage', groupAIMessage);
            }
          }
        }
      } else {
        console.log('❌ Group not found for AI message');
      }
    } else {
      // Save AI message to Message table for persistence (private chat)
      const savedMessage = new Message({
        senderId: 'MIZU_AI',
        receiverId: originalMessage.senderId, // Reply to the person who mentioned @mizu
        chatPartnerId: originalMessage.receiverId, // Who they were chatting with (for query lookup)
        senderName: 'MIZU',
        senderAvatar: null,
        content: cleanResponse,
        songRecommendations: enrichedRecommendations,
        isAI: true
      });
      await savedMessage.save();
      console.log('💾 AI message saved to Message:', savedMessage._id, 'chatPartnerId:', originalMessage.receiverId);

      // Send via socket with songRecommendations
      const privateAIMessage = {
        ...savedMessage.toObject(),
        songRecommendations: enrichedRecommendations,
        isAI: true
      };

      // Send to original sender if online
      const senderSocketId = onlineUsers.get(originalMessage.senderId);
      if (senderSocketId) {
        console.log('📤 Sending AI message to sender:', originalMessage.senderId);
        io.to(senderSocketId).emit('newMessage', privateAIMessage);
      } else {
        console.log('👻 Original sender not online');
      }

      // Send to the chat partner (the person the sender was talking to) if online
      // We only do this if it's not a self-chat (though self-chat wouldn't have a distinct receiverId usually)
      if (originalMessage.receiverId && originalMessage.receiverId !== originalMessage.senderId) {
        const partnerSocketId = onlineUsers.get(originalMessage.receiverId);
        if (partnerSocketId) {
          console.log('📤 Sending AI message to partner:', originalMessage.receiverId);
          io.to(partnerSocketId).emit('newMessage', privateAIMessage);
        } else {
          console.log('👻 Chat partner not online');
        }
      }
    }

    console.log('✅ MIZU AI response sent successfully');
  } catch (error) {
    console.error('Error handling MIZU mention:', error);
  }
};

// Get AI conversation data by ID (for displaying AI responses)
export const getAIConversation = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;

    const conversation = await AIChatConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'AI conversation not found' });
    }

    // Find specific message if messageId provided
    if (messageId) {
      const message = conversation.messages.id(messageId);
      if (!message) {
        return res.status(404).json({ message: 'AI message not found' });
      }
      return res.json(message);
    }

    // Return entire conversation
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching AI conversation:', error);
    res.status(500).json({ message: 'Error fetching AI conversation' });
  }
};

// Get all users for chat (friends list)
export const getUsers = async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId }).populate('friends');
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }
    res.json(currentUser.friends);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Search users by uniqueId or name
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    // Get friend IDs to exclude
    const friendIds = currentUser.friends.map(id => id.toString());

    const users = await User.find({
      $and: [
        { _id: { $ne: currentUser._id } },
        { _id: { $nin: currentUser.friends } }, // Exclude already friends
        {
          $or: [
            { uniqueId: { $regex: query, $options: 'i' } },
            { fullName: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('fullName imageUrl uniqueId _id clerkId friendRequests');

    // Check request status for each user
    const usersWithRequestStatus = users.map(user => {
      // Check if I sent a request to them
      const requestSent = user.friendRequests.some(req =>
        req.from && req.from.toString() === currentUser._id.toString()
      );

      // Check if they sent a request to me
      const requestReceived = currentUser.friendRequests.some(req =>
        req.from && req.from.toString() === user._id.toString()
      );

      return {
        _id: user._id,
        clerkId: user.clerkId,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        uniqueId: user.uniqueId,
        requestSent,
        requestReceived
      };
    });

    res.json(usersWithRequestStatus);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
};

// Send friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body; // Internal DB _id
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    if (currentUser._id.toString() === recipientId) {
      return res.status(400).json({ message: "You cannot add yourself." });
    }

    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if request already exists
    const existingRequest = recipient.friendRequests.find(req =>
      req.from.toString() === currentUser._id.toString()
    );

    if (existingRequest) {
      return res.status(400).json({ message: "Request already sent." });
    }

    if (recipient.friends.includes(currentUser._id)) {
      return res.status(400).json({ message: "Already friends." });
    }

    // Push object instead of ID
    recipient.friendRequests.push({ from: currentUser._id });
    await recipient.save();

    // Create and emit notification to recipient
    await createNotification(
      req,
      recipient._id,
      'friend-request',
      currentUser,
      `${currentUser.fullName} sent you a friend request`
    );

    res.status(200).json({ message: "Friend request sent." });

  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Error sending friend request' });
  }
};

// Accept friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.body; // Internal DB _id of the requester
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const requester = await User.findById(requesterId);

    if (!requester) {
      return res.status(404).json({ message: "Requester not found." });
    }

    // Add to each other's friends list
    if (!currentUser.friends.includes(requester._id)) {
      currentUser.friends.push(requester._id);

      // Remove from friendRequests (filtering objects)
      currentUser.friendRequests = currentUser.friendRequests.filter(req =>
        req.from.toString() !== requesterId
      );

      await currentUser.save();
    }

    if (!requester.friends.includes(currentUser._id)) {
      requester.friends.push(currentUser._id);
      await requester.save();
    }

    // Create and emit notification to requester that their request was accepted
    await createNotification(
      req,
      requester._id,
      'friend-accepted',
      currentUser,
      `${currentUser.fullName} accepted your friend request`
    );

    res.status(200).json({ message: "Friend request accepted." });

  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Error accepting friend request' });
  }
};

// Decline friend request
export const declineFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.body;
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const requester = await User.findById(requesterId);

    // Remove requester from friendRequests
    currentUser.friendRequests = currentUser.friendRequests.filter(req =>
      req.from.toString() !== requesterId
    );
    await currentUser.save();

    // Notify requester that their request was declined
    if (requester) {
      await createNotification(
        req,
        requester._id,
        'friend-declined',
        currentUser,
        `${currentUser.fullName} declined your friend request`
      );
    }

    res.status(200).json({ message: "Friend request declined." });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ message: 'Error declining friend request' });
  }
};

// Get friend requests
export const getFriendRequests = async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId })
      .populate('friendRequests.from', 'fullName imageUrl uniqueId _id clerkId');

    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    // Extract user objects from the requests to match frontend expectation
    const requests = currentUser.friendRequests
      .filter(req => req.from) // Filter out nulls if user deleted
      .map(req => req.from);

    res.json(requests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ message: 'Error fetching friend requests' });
  }
};

// Get messages between two users
export const getMessages = async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req);
    const { recipientId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: recipientId },
        { senderId: recipientId, receiverId: currentUserId },
        // Include AI messages that belong to this conversation context (for sender)
        { senderId: 'MIZU_AI', receiverId: currentUserId, chatPartnerId: recipientId },
        // Include AI messages visible to the chat partner (receiver side)
        { senderId: 'MIZU_AI', receiverId: recipientId, chatPartnerId: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { userId: senderId } = getAuth(req);
    const { recipientId, content, attachment } = req.body;

    if (!recipientId || (!content && !attachment)) {
      return res.status(400).json({ message: 'Recipient ID and either content or attachment are required' });
    }

    // Get sender info for AI context
    const senderUser = await User.findOne({ clerkId: senderId });
    const senderName = senderUser?.fullName || 'User';

    const message = new Message({
      senderId,
      receiverId: recipientId,
      content,
      attachment
    });

    await message.save();

    // Emit socket event for real-time messaging
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');

    // Send to recipient if online
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('newMessage', {
        ...message.toObject(),
        senderInfo: senderUser
      });
    }

    // Check for @mizu mention and handle AI response
    if (containsMizuMention(content)) {
      // Get recent chat history for context
      const recentMessages = await Message.find({
        $or: [
          { senderId: senderId, receiverId: recipientId },
          { senderId: recipientId, receiverId: senderId }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Convert messages to chat context format
      const chatContext = recentMessages.reverse().map(msg => ({
        senderName: msg.senderId === senderId ? senderName : 'Friend',
        content: msg.content || ''
      }));

      // Handle AI response asynchronously (don't wait for it)
      setImmediate(() => {
        handleMizuMention(message, chatContext, senderName, io, onlineUsers, false, null);
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
};

// Get online users
export const getOnlineUsers = async (req, res) => {
  try {
    const onlineUsers = req.app.get('onlineUsers');
    const onlineUserIds = Array.from(onlineUsers.keys());
    res.json(onlineUserIds);
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({ message: 'Error fetching online users' });
  }
};

// Remove friend (unfriend)
export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.body; // clerkId of friend to remove
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const friend = await User.findOne({ clerkId: friendId });
    if (!friend) {
      return res.status(404).json({ message: "Friend not found." });
    }

    // Remove from each other's friends list
    currentUser.friends = currentUser.friends.filter(id => id.toString() !== friend._id.toString());
    await currentUser.save();

    friend.friends = friend.friends.filter(id => id.toString() !== currentUser._id.toString());
    await friend.save();

    // Notify the removed friend
    await createNotification(
      req,
      friend._id,
      'friend-removed',
      currentUser,
      `${currentUser.fullName} removed you as a friend`
    );

    // Delete all messages between them
    await Message.deleteMany({
      $or: [
        { senderId: currentUserId, receiverId: friendId },
        { senderId: friendId, receiverId: currentUserId }
      ]
    });

    res.status(200).json({ message: "Friend removed successfully." });

  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ message: 'Error removing friend' });
  }
};

// ================== GROUP FUNCTIONS ==================

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, memberIds } = req.body; // memberIds are internal DB _ids
    const imageFile = req.files?.image;
    const { userId: currentUserId } = getAuth(req);

    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    let imageUrl = "";
    if (imageFile) {
      const uploadResponse = await cloudinary.uploader.upload(imageFile.tempFilePath);
      imageUrl = uploadResponse.secure_url;
    }

    // Include creator as a member
    const members = [currentUser._id];
    if (memberIds && memberIds.length > 0) {
      // Validate that all member IDs are valid users and friends
      for (const memberId of memberIds) {
        const member = await User.findById(memberId);
        if (member && !members.includes(member._id)) {
          members.push(member._id);
        }
      }
    }

    const group = await Group.create({
      name: name.trim(),
      imageUrl,
      creatorId: currentUserId,
      members,
      admins: [currentUser._id], // Initialize creator as first admin
    });

    // Populate members for response
    const populatedGroup = await Group.findById(group._id).populate('members', 'fullName imageUrl clerkId uniqueId');

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Error creating group' });
  }
};

// Get all groups for current user
export const getMyGroups = async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const groups = await Group.find({ members: currentUser._id })
      .populate('members', 'fullName imageUrl clerkId uniqueId')
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Error fetching groups' });
  }
};

// Get a single group by ID
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const group = await Group.findById(id).populate('members', 'fullName imageUrl clerkId uniqueId');

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    if (!group.members.some(m => m._id.toString() === currentUser._id.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Error fetching group' });
  }
};

// Get messages for a group
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    // Check if user is a member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.some(m => m.toString() === currentUser._id.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const messages = await GroupMessage.find({ groupId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ message: 'Error fetching group messages' });
  }
};

// Send a message to a group
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId, content, attachment } = req.body;
    const { userId: senderId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: senderId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    // Check if user is a member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.some(m => m.toString() === currentUser._id.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    if (!content && !attachment) {
      return res.status(400).json({ message: 'Content or attachment is required' });
    }

    const message = new GroupMessage({
      groupId,
      senderId,
      senderName: currentUser.fullName,
      senderAvatar: currentUser.imageUrl,
      content,
      attachment
    });

    await message.save();

    // Emit socket event for real-time messaging to all group members
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');

    // Send to all online members of the group except sender
    for (const member of group.members) {
      const memberUser = await User.findById(member);
      if (memberUser && memberUser.clerkId !== senderId) {
        const memberSocketId = onlineUsers.get(memberUser.clerkId);
        if (memberSocketId) {
          io.to(memberSocketId).emit('newGroupMessage', {
            ...message.toObject(),
            groupId: group._id
          });
        }
      }
    }

    // Check for @mizu mention and handle AI response
    if (containsMizuMention(content)) {
      // Get recent group chat history for context
      const recentMessages = await GroupMessage.find({ groupId: groupId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Convert messages to chat context format
      const chatContext = recentMessages.reverse().map(msg => ({
        senderName: msg.senderName || 'User',
        content: msg.content || ''
      }));

      // Handle AI response asynchronously (don't wait for it)
      setImmediate(() => {
        handleMizuMention(message, chatContext, currentUser.fullName, io, onlineUsers, true, groupId);
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ message: 'Error sending group message' });
  }
};

// ================== GROUP MANAGEMENT FUNCTIONS ==================

// Helper function to create system messages
const createSystemMessage = async (groupId, type, data) => {
  const systemMessage = new GroupMessage({
    groupId,
    isSystemMessage: true,
    systemMessageType: type,
    systemMessageData: data,
    content: '' // Empty content for system messages
  });
  await systemMessage.save();
  return systemMessage;
};

// Helper function to check if user is admin
const isUserAdmin = (group, userId) => {
  return group.admins.some(adminId => adminId.toString() === userId.toString());
};

// Add member to group (admin only)
export const addGroupMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body; // MongoDB ObjectId of user to add
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const group = await Group.findById(groupId).populate('members', 'fullName imageUrl clerkId uniqueId');
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if current user is admin
    if (!isUserAdmin(group, currentUser._id)) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    // Check if member already exists
    if (group.members.some(m => m._id.toString() === memberId)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    const newMember = await User.findById(memberId);
    if (!newMember) {
      return res.status(404).json({ message: "User to add not found" });
    }

    // Add member
    group.members.push(newMember._id);
    await group.save();

    // Create system message
    const systemMessage = await createSystemMessage(groupId, 'member_added', {
      adminName: currentUser.fullName,
      memberName: newMember.fullName
    });

    // Emit socket event to all group members
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const populatedGroup = await Group.findById(groupId).populate('members', 'fullName imageUrl clerkId uniqueId');

    for (const member of populatedGroup.members) {
      const memberSocketId = onlineUsers.get(member.clerkId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('groupMemberAdded', {
          groupId,
          group: populatedGroup,
          systemMessage
        });
      }
    }

    res.status(200).json({ message: "Member added successfully", group: populatedGroup, systemMessage });
  } catch (error) {
    console.error('Error adding group member:', error);
    res.status(500).json({ message: 'Error adding group member' });
  }
};

// Remove member from group (admin only)
export const removeGroupMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if current user is admin
    if (!isUserAdmin(group, currentUser._id)) {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    const memberToRemove = await User.findById(memberId);
    if (!memberToRemove) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Prevent removing the creator
    if (memberToRemove.clerkId === group.creatorId) {
      return res.status(403).json({ message: "Cannot remove the group creator" });
    }

    // Remove from members and admins
    group.members = group.members.filter(m => m.toString() !== memberId);
    group.admins = group.admins.filter(a => a.toString() !== memberId);
    await group.save();

    // Create system message
    const systemMessage = await createSystemMessage(groupId, 'member_removed', {
      adminName: currentUser.fullName,
      memberName: memberToRemove.fullName
    });

    // Emit socket event
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const populatedGroup = await Group.findById(groupId).populate('members', 'fullName imageUrl clerkId uniqueId');

    // Notify all remaining members
    for (const member of populatedGroup.members) {
      const memberSocketId = onlineUsers.get(member.clerkId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('groupMemberRemoved', {
          groupId,
          group: populatedGroup,
          systemMessage
        });
      }
    }

    // Notify the removed member
    const removedMemberSocketId = onlineUsers.get(memberToRemove.clerkId);
    if (removedMemberSocketId) {
      io.to(removedMemberSocketId).emit('groupMemberRemoved', {
        groupId,
        group: null, // They're no longer a member
        systemMessage
      });
    }

    res.status(200).json({ message: "Member removed successfully", group: populatedGroup, systemMessage });
  } catch (error) {
    console.error('Error removing group member:', error);
    res.status(500).json({ message: 'Error removing group member' });
  }
};

// Promote member to admin (admin only)
export const promoteToAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if current user is admin
    if (!isUserAdmin(group, currentUser._id)) {
      return res.status(403).json({ message: "Only admins can promote members" });
    }

    const memberToPromote = await User.findById(memberId);
    if (!memberToPromote) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Check if already admin
    if (isUserAdmin(group, memberId)) {
      return res.status(400).json({ message: "User is already an admin" });
    }

    // Add to admins
    group.admins.push(memberId);
    await group.save();

    // Create system message
    const systemMessage = await createSystemMessage(groupId, 'admin_promoted', {
      memberName: memberToPromote.fullName
    });

    // Emit socket event
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const populatedGroup = await Group.findById(groupId).populate('members', 'fullName imageUrl clerkId uniqueId');

    for (const member of populatedGroup.members) {
      const memberSocketId = onlineUsers.get(member.clerkId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('groupAdminPromoted', {
          groupId,
          group: populatedGroup,
          systemMessage
        });
      }
    }

    res.status(200).json({ message: "Member promoted to admin", group: populatedGroup, systemMessage });
  } catch (error) {
    console.error('Error promoting to admin:', error);
    res.status(500).json({ message: 'Error promoting to admin' });
  }
};

// Demote admin (admin only)
export const demoteAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if current user is admin
    if (!isUserAdmin(group, currentUser._id)) {
      return res.status(403).json({ message: "Only admins can demote admins" });
    }

    const memberToDemote = await User.findById(memberId);
    if (!memberToDemote) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Prevent demoting the creator
    if (memberToDemote.clerkId === group.creatorId) {
      return res.status(403).json({ message: "Cannot demote the group creator" });
    }

    // Check if user is admin
    if (!isUserAdmin(group, memberId)) {
      return res.status(400).json({ message: "User is not an admin" });
    }

    // Remove from admins
    group.admins = group.admins.filter(a => a.toString() !== memberId);
    await group.save();

    // Create system message
    const systemMessage = await createSystemMessage(groupId, 'admin_demoted', {
      memberName: memberToDemote.fullName
    });

    // Emit socket event
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const populatedGroup = await Group.findById(groupId).populate('members', 'fullName imageUrl clerkId uniqueId');

    for (const member of populatedGroup.members) {
      const memberSocketId = onlineUsers.get(member.clerkId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('groupAdminDemoted', {
          groupId,
          group: populatedGroup,
          systemMessage
        });
      }
    }

    res.status(200).json({ message: "Admin demoted", group: populatedGroup, systemMessage });
  } catch (error) {
    console.error('Error demoting admin:', error);
    res.status(500).json({ message: 'Error demoting admin' });
  }
};

// Update group name (admin only)
export const updateGroupName = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if current user is admin
    if (!isUserAdmin(group, currentUser._id)) {
      return res.status(403).json({ message: "Only admins can change group name" });
    }

    const oldName = group.name;
    group.name = name.trim();
    await group.save();

    // Create system message
    const systemMessage = await createSystemMessage(groupId, 'group_name_changed', {
      adminName: currentUser.fullName,
      oldName,
      newName: name.trim()
    });

    // Emit socket event
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const populatedGroup = await Group.findById(groupId).populate('members', 'fullName imageUrl clerkId uniqueId');

    for (const member of populatedGroup.members) {
      const memberSocketId = onlineUsers.get(member.clerkId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('groupNameUpdated', {
          groupId,
          group: populatedGroup,
          systemMessage
        });
      }
    }

    res.status(200).json({ message: "Group name updated", group: populatedGroup, systemMessage });
  } catch (error) {
    console.error('Error updating group name:', error);
    res.status(500).json({ message: 'Error updating group name' });
  }
};

// Update group image (admin only)
export const updateGroupImage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const imageFile = req.files?.image;
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!imageFile) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if current user is admin
    if (!isUserAdmin(group, currentUser._id)) {
      return res.status(403).json({ message: "Only admins can change group image" });
    }

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(imageFile.tempFilePath);
    group.imageUrl = uploadResponse.secure_url;
    await group.save();

    // Create system message
    const systemMessage = await createSystemMessage(groupId, 'group_image_changed', {
      adminName: currentUser.fullName
    });

    // Emit socket event
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const populatedGroup = await Group.findById(groupId).populate('members', 'fullName imageUrl clerkId uniqueId');

    for (const member of populatedGroup.members) {
      const memberSocketId = onlineUsers.get(member.clerkId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('groupImageUpdated', {
          groupId,
          group: populatedGroup,
          systemMessage
        });
      }
    }

    res.status(200).json({ message: "Group image updated", group: populatedGroup, systemMessage });
  } catch (error) {
    console.error('Error updating group image:', error);
    res.status(500).json({ message: 'Error updating group image' });
  }
};

// Leave group (any member)
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    if (!group.members.some(m => m.toString() === currentUser._id.toString())) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    // Remove from members and admins
    group.members = group.members.filter(m => m.toString() !== currentUser._id.toString());
    group.admins = group.admins.filter(a => a.toString() !== currentUser._id.toString());

    // If creator is leaving and is the last admin, promote another member
    if (currentUser.clerkId === group.creatorId && group.admins.length === 0 && group.members.length > 0) {
      group.admins.push(group.members[0]);
    }

    await group.save();

    // Create system message
    const systemMessage = await createSystemMessage(groupId, 'member_left', {
      memberName: currentUser.fullName
    });

    // Emit socket event to remaining members
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const populatedGroup = await Group.findById(groupId).populate('members', 'fullName imageUrl clerkId uniqueId');

    for (const member of populatedGroup.members) {
      const memberSocketId = onlineUsers.get(member.clerkId);
      if (memberSocketId) {
        io.to(memberSocketId).emit('groupMemberLeft', {
          groupId,
          group: populatedGroup,
          systemMessage
        });
      }
    }

    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Error leaving group' });
  }
};

