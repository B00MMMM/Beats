import { Message } from '../models/message.model.js';
import { User } from '../models/user.model.js';
import { Group } from '../models/group.model.js';
import { GroupMessage } from '../models/groupMessage.model.js';
import { getAuth } from "@clerk/express";
import { createNotification } from './notification.controller.js';
import cloudinary from '../lib/cloudinary.js';

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
    const usersWithRequestStatus = users.map(user => ({
      _id: user._id,
      clerkId: user.clerkId,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      uniqueId: user.uniqueId,
      requestSent: user.friendRequests.some(id => id.toString() === currentUser._id.toString()),
      requestReceived: currentUser.friendRequests.some(id => id.toString() === user._id.toString())
    }));

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

    if (recipient.friendRequests.includes(currentUser._id)) {
      return res.status(400).json({ message: "Request already sent." });
    }

    if (recipient.friends.includes(currentUser._id)) {
      return res.status(400).json({ message: "Already friends." });
    }

    recipient.friendRequests.push(currentUser._id);
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
    const { requesterId } = req.body; // Internal DB _id
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
      currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
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
    currentUser.friendRequests = currentUser.friendRequests.filter(
      id => id.toString() !== requesterId
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
    const currentUser = await User.findOne({ clerkId: currentUserId }).populate('friendRequests', 'fullName imageUrl uniqueId _id clerkId');
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }
    res.json(currentUser.friendRequests);
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
        { senderId: recipientId, receiverId: currentUserId }
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
        senderInfo: await User.findOne({ clerkId: senderId })
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

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ message: 'Error sending group message' });
  }
};
