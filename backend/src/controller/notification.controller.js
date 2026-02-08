import { getAuth } from '@clerk/express';
import { User } from '../models/user.model.js';
import { Notification } from '../models/notification.model.js';

// Get all notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const notifications = await Notification.find({ recipient: currentUser._id })
      .populate('from', 'fullName imageUrl clerkId uniqueId')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

// Get unread notification count
export const getUnreadCount = async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const count = await Notification.countDocuments({ 
      recipient: currentUser._id, 
      read: false 
    });

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
};

// Mark notifications as read
export const markAsRead = async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const { notificationIds } = req.body;

    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await Notification.updateMany(
        { _id: { $in: notificationIds }, recipient: currentUser._id },
        { read: true }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        { recipient: currentUser._id },
        { read: true }
      );
    }

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req);
    const currentUser = await User.findOne({ clerkId: currentUserId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const { notificationId } = req.params;

    await Notification.deleteOne({ 
      _id: notificationId, 
      recipient: currentUser._id 
    });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
};

// Helper function to create and emit notification
export const createNotification = async (req, recipientId, type, fromUser, message) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      from: fromUser._id,
      message
    });

    // Populate for socket emission
    await notification.populate('from', 'fullName imageUrl clerkId uniqueId');

    // Get socket info
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    
    // Find recipient's clerkId
    const recipient = await User.findById(recipientId);
    if (recipient) {
      const recipientSocketId = onlineUsers.get(recipient.clerkId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('notification', {
          _id: notification._id,
          type: notification.type,
          from: {
            id: notification.from.clerkId,
            dbId: notification.from._id,
            name: notification.from.fullName,
            avatar: notification.from.imageUrl,
            uniqueId: notification.from.uniqueId
          },
          message: notification.message,
          read: notification.read,
          createdAt: notification.createdAt
        });
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};
