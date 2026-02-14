import { User } from "../models/user.model.js";
import { ListeningHistory } from "../models/listeningHistory.model.js";
import { SongRequest } from "../models/songRequest.model.js";
import { Song } from "../models/song.model.js";
import { getAuth } from "@clerk/express";
import { existsInDrive } from "../lib/drive.js";

// ... (existing imports)

// ... (existing code for toggleLike, getFavorites, getAllUsers)

// ... (existing code)

// ... (existing imports)

export const toggleLike = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { songData } = req.body;
        const deezerId = String(songData.id || songData.deezerId);

        let entry = await ListeningHistory.findOne({ userId, deezerId });

        if (entry) {
            entry.isLiked = !entry.isLiked;
            await entry.save();
            return res.json({ isLiked: entry.isLiked });
        } else {
            await ListeningHistory.create({
                userId,
                deezerId,
                title: songData.title,
                artist: songData.artist?.name || songData.artist,
                cover: songData.cover || songData.album?.cover_medium,
                duration: songData.duration,
                isLiked: true,
                count: 0
            });
            return res.json({ isLiked: true });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getFavorites = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const favorites = await ListeningHistory.find({ userId, isLiked: true }).sort({ createdAt: -1 });
        res.json(favorites);
    } catch (error) {
        console.error("Error fetching favorites:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all users (for friends feature, etc.)
export const getAllUsers = async (req, res, next) => {
    try {
        const { userId: currentUserId } = getAuth(req);
        const users = await User.find({ clerkId: { $ne: currentUserId } });
        res.json(users);
    } catch (error) {
        next(error);
    }
};

// Add entry to listening history
export const addListeningHistory = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { songData } = req.body;
        const deezerId = String(songData.id || songData.deezerId);

        if (!songData) {
            return res.status(400).json({ message: "Song data required" });
        }

        // 1. Check if song needs to be requested (not in Drive)
        // We do this here so it counts only on actual user play
        const hasDrive = await existsInDrive(deezerId);

        if (!hasDrive) {
            try {
                await SongRequest.findOneAndUpdate(
                    { deezerId: String(deezerId) },
                    {
                        $inc: { playCount: 1 },
                        $set: { lastPlayed: new Date() },
                        $setOnInsert: {
                            title: songData.title,
                            artist: songData.artist?.name || songData.artist, // Handle object or string
                            album: songData.album?.title || 'Unknown Album',
                            duration: songData.duration,
                            imageUrl: songData.cover || songData.album?.cover_medium || null,
                            isPreviewOnly: true,
                            isChecked: false
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                console.log(`Logged request for song: ${songData.title} (${deezerId})`);
            } catch (reqErr) {
                console.error("Failed to log song request:", reqErr);
            }
        }

        // 2. Add to Listening History
        let entry = await ListeningHistory.findOne({ userId, deezerId });

        if (entry) {
            entry.count += 1;
            entry.listenedAt = Date.now();
            await entry.save();
        } else {
            await ListeningHistory.create({
                userId,
                deezerId,
                title: songData.title,
                artist: songData.artist?.name || songData.artist,
                cover: songData.cover || songData.album?.cover_medium,
                duration: songData.duration,
                count: 1,
                listenedAt: Date.now()
            });
        }

        res.status(201).json({ message: "History recorded" });

    } catch (error) {
        console.error("Error adding history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getListeningHistory = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        // Fetch where count > 0 (actually played) or just all? 
        // User asked for "Recent plays". So implied "played".
        const history = await ListeningHistory.find({ userId, count: { $gt: 0 } })
            .sort({ listenedAt: -1 })
            .limit(20);
        res.json(history);
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateActivity = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const { activity, isPlaying } = req.body; // { songId, title, artist, cover }, isPlaying boolean

        const user = await User.findOne({ clerkId: userId });
        if (!user) return res.status(404).json({ message: "User not found" });

        // If paused (isPlaying === false) or no activity, clear the activity
        if (isPlaying === false || !activity) {
            user.currentActivity = undefined;
        } else {
            user.currentActivity = {
                ...activity,
                updatedAt: new Date()
            };
        }
        await user.save();

        // Broadcast to friends if sharing is enabled
        if (user.isActivityShared) {
            const io = req.app.get('io');
            const onlineUsers = req.app.get('onlineUsers');

            // Find friends who are online
            const friends = await User.find({ _id: { $in: user.friends } });

            friends.forEach(friend => {
                const socketId = onlineUsers.get(friend.clerkId);
                if (socketId) {
                    // Send full user info so they can be re-added when resuming
                    io.to(socketId).emit('friend-activity-updated', {
                        userId: user.clerkId,
                        name: user.fullName,
                        avatar: user.imageUrl,
                        activity: user.currentActivity || null
                    });
                }
            });
        }

        res.status(200).json({ message: "Activity updated" });
    } catch (error) {
        console.error("Error updating activity:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const toggleActivitySharing = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const user = await User.findOne({ clerkId: userId });

        if (!user) return res.status(404).json({ message: "User not found" });

        user.isActivityShared = !user.isActivityShared;

        // Don't clear currentActivity on toggle-off — it keeps being updated
        // by the updateActivity endpoint. Just stop/start broadcasting it.

        await user.save();

        // Broadcast update (clear or just status change)
        const io = req.app.get('io');
        const onlineUsers = req.app.get('onlineUsers');

        const friends = await User.find({ _id: { $in: user.friends } });

        // Only broadcast valid activity (must have songId and title)
        const hasValidActivity = user.isActivityShared &&
            user.currentActivity &&
            user.currentActivity.songId &&
            user.currentActivity.title;

        friends.forEach(friend => {
            const socketId = onlineUsers.get(friend.clerkId);
            if (socketId) {
                io.to(socketId).emit('friend-activity-updated', {
                    userId: user.clerkId,
                    name: user.fullName,
                    avatar: user.imageUrl,
                    activity: hasValidActivity ? user.currentActivity : null
                });
            }
        });

        res.json({ isActivityShared: user.isActivityShared });
    } catch (error) {
        console.error("Error toggling activity sharing:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getFriendsActivity = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const user = await User.findOne({ clerkId: userId }).populate('friends');

        if (!user) return res.status(404).json({ message: "User not found" });

        // Get friends who have sharing enabled and recent activity (e.g. last 24h?)
        // For now just return if they have activity
        const friendsActivity = user.friends
            .filter(friend => friend.isActivityShared && friend.currentActivity && friend.currentActivity.songId && friend.currentActivity.title)
            .map(friend => ({
                userId: friend.clerkId,
                name: friend.fullName,
                avatar: friend.imageUrl,
                activity: friend.currentActivity
            }));

        res.json(friendsActivity);
    } catch (error) {
        console.error("Error fetching friends activity:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};