import { Message } from '../models/message.model.js';
import { User } from '../models/user.model.js';
import { getAuth } from "@clerk/express";

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

    // Emit notification to recipient
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const recipientSocketId = onlineUsers.get(recipient.clerkId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('notification', {
        type: 'friend-request',
        from: {
          id: currentUser.clerkId,
          dbId: currentUser._id,
          name: currentUser.fullName,
          avatar: currentUser.imageUrl
        },
        message: `${currentUser.fullName} sent you a friend request`,
        createdAt: new Date()
      });
    }

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

    // Emit notification to requester that their request was accepted
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const requesterSocketId = onlineUsers.get(requester.clerkId);
    if (requesterSocketId) {
      io.to(requesterSocketId).emit('notification', {
        type: 'friend-accepted',
        from: {
          id: currentUser.clerkId,
          dbId: currentUser._id,
          name: currentUser.fullName,
          avatar: currentUser.imageUrl
        },
        message: `${currentUser.fullName} accepted your friend request`,
        createdAt: new Date()
      });
    }

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

    // Remove requester from friendRequests
    currentUser.friendRequests = currentUser.friendRequests.filter(
      id => id.toString() !== requesterId
    );
    await currentUser.save();

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
    const currentUser = await User.findOne({ clerkId: currentUserId }).populate('friendRequests', 'fullName imageUrl uniqueId _id');
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
