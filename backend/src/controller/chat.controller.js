import { Message } from '../models/message.model.js';
import { User } from '../models/user.model.js';

// Get all users for chat (friends list)
export const getUsers = async (req, res) => {
  try {
    const currentUserId = req.auth.userId;
    const users = await User.find({ clerkId: { $ne: currentUserId } });
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Get messages between two users
export const getMessages = async (req, res) => {
  try {
    const currentUserId = req.auth.userId;
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
    const senderId = req.auth.userId;
    const { recipientId, content } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({ message: 'Recipient ID and content are required' });
    }

    const message = new Message({
      senderId,
      receiverId: recipientId,
      content
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
