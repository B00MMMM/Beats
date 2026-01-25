import { User } from "../models/user.model.js";
import { ListeningHistory } from "../models/listeningHistory.model.js";
import { Song } from "../models/song.model.js";

export const toggleLike = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { songData } = req.body;

        const existing = await ListeningHistory.findOne({
            userId,
            deezerId: String(songData.id || songData.deezerId),
            isLiked: true
        });

        if (existing) {
            await ListeningHistory.findByIdAndDelete(existing._id);
            return res.json({ isLiked: false });
        } else {
            await ListeningHistory.create({
                userId,
                deezerId: String(songData.id || songData.deezerId),
                title: songData.title,
                artist: songData.artist?.name || songData.artist,
                cover: songData.cover || songData.album?.cover_medium,
                duration: songData.duration,
                isLiked: true
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
        const userId = req.auth.userId;
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
        const currentUserId = req.auth.userId;
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

        if (!songData) {
            return res.status(400).json({ message: "Song data required" });
        }

        // Store history directly without creating a Song document
        await ListeningHistory.create({
            userId,
            deezerId: String(songData.id || songData.deezerId),
            title: songData.title,
            artist: songData.artist?.name || songData.artist, // Handle object or string
            cover: songData.cover || songData.album?.cover_medium,
            duration: songData.duration,
        });

        res.status(201).json({ message: "History recorded" });

    } catch (error) {
        console.error("Error adding history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};