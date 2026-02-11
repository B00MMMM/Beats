import { Playlist } from "../models/playlist.model.js";
import { PlaylistSong } from "../models/playlistSong.model.js";
import { Song } from "../models/song.model.js";
import { Message } from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getAuth } from "@clerk/express";

// Create a new playlist
export const createPlaylist = async (req, res) => {
    try {
        const { title, description, availability } = req.body;
        const { userId } = getAuth(req);

        const playlist = await Playlist.create({
            title,
            description,
            userId,
            availability: availability || 'private',
        });

        res.status(201).json(playlist);
    } catch (error) {
        console.error("Error creating playlist:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all playlists for the current user
// Get all playlists for the current user
export const getMyPlaylists = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const playlists = await Playlist.find({ userId }).sort({ createdAt: -1 });
        res.json(playlists);
    } catch (error) {
        console.error("Error fetching playlists:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get a single playlist by ID with songs
export const getPlaylistById = async (req, res) => {
    try {
        const { id } = req.params;
        const playlist = await Playlist.findById(id);

        if (!playlist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        // Fetch songs in the playlist
        const playlistSongs = await PlaylistSong.find({ playlistId: id })
            .populate("songId")
            .sort({ createdAt: 1 });

        const songs = playlistSongs.map(ps => ({
            ...ps.songId.toObject(),
            addedAt: ps.createdAt
        }));

        res.json({ ...playlist.toObject(), songs });
    } catch (error) {
        console.error("Error fetching playlist details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Add a song to a playlist
export const addSongToPlaylist = async (req, res) => {
    try {
        const { id } = req.params; // Playlist ID
        const { songData } = req.body; // Full song object from frontend (Deezer format)

        const playlist = await Playlist.findById(id);
        if (!playlist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        if (playlist.userId !== req.auth.userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // 1. Ensure Song exists in our DB
        let song = await Song.findOne({ deezerId: String(songData.id || songData.deezerId) });

        if (!song) {
            song = await Song.create({
                deezerId: String(songData.id || songData.deezerId),
                title: songData.title,
                artist: songData.artist,
                album: songData.album,
                cover: songData.cover || songData.album?.cover_medium,
                duration: songData.duration,
            });
        }

        // 2. Add to PlaylistSong
        try {
            await PlaylistSong.create({
                playlistId: id,
                songId: song._id,
            });
            res.status(201).json({ message: "Song added to playlist", song });
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: "Song already in playlist" });
            }
            throw err;
        }

    } catch (error) {
        console.error("Error adding song into playlist:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Remove a song from a playlist
export const removeSongFromPlaylist = async (req, res) => {
    try {
        const { id, songId } = req.params; // playlistId, internal songId

        const playlist = await Playlist.findById(id);
        if (!playlist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        if (playlist.userId !== req.auth.userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await PlaylistSong.deleteOne({ playlistId: id, songId: songId });

        res.json({ message: "Song removed" });

    } catch (error) {
        console.error("Error removing song from playlist:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// Check which playlists contain a specific song
export const checkSongInPlaylists = async (req, res) => {
    try {
        const { deezerId } = req.params;
        const { userId } = getAuth(req);

        // 1. Find the internal Song ID (if it exists)
        const song = await Song.findOne({ deezerId: String(deezerId) });
        if (!song) {
            return res.json([]); // Song not tracking in DB yet, so definitely not in any playlist
        }

        // 2. Find User's Playlists
        const userPlaylists = await Playlist.find({ userId }).select('_id');
        const playlistIds = userPlaylists.map(p => p._id);

        // 3. Find PlaylistSongs where playlist is in userPlaylists AND song is our song
        const matches = await PlaylistSong.find({
            playlistId: { $in: playlistIds },
            songId: song._id
        }).select('playlistId');

        res.json(matches.map(m => m.playlistId));
    } catch (error) {
        console.error("Error checking song in playlists:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update playlist details (title, description, image, availability)
export const updatePlaylist = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, availability } = req.body;
        const imageFile = req.files?.image;

        const playlist = await Playlist.findById(id);
        if (!playlist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        if (playlist.userId !== req.auth.userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        let imageUrl = playlist.imageUrl;

        if (imageFile) {
            const uploadResponse = await cloudinary.uploader.upload(imageFile.tempFilePath);
            imageUrl = uploadResponse.secure_url;
        }

        playlist.title = title || playlist.title;
        playlist.description = description !== undefined ? description : playlist.description;
        playlist.imageUrl = imageUrl;
        if (availability && ['private', 'public'].includes(availability)) {
            playlist.availability = availability;
        }

        await playlist.save();

        res.json(playlist);

    } catch (error) {
        console.error("Error updating playlist:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Search public playlists by title
export const searchPublicPlaylists = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.json([]);
        }

        const playlists = await Playlist.find({
            availability: 'public',
            title: { $regex: q, $options: 'i' }
        })
            .limit(20)
            .sort({ createdAt: -1 });

        // Get song counts for each playlist
        const playlistsWithCounts = await Promise.all(
            playlists.map(async (playlist) => {
                const songCount = await PlaylistSong.countDocuments({ playlistId: playlist._id });
                return {
                    ...playlist.toObject(),
                    songCount
                };
            })
        );

        res.json(playlistsWithCounts);
    } catch (error) {
        console.error("Error searching playlists:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// Update playlist image only (dedicated endpoint)
export const updatePlaylistImage = async (req, res) => {
    try {
        const { id } = req.params;
        const imageFile = req.files?.image;

        if (!imageFile) {
            return res.status(400).json({ message: "Image file is required" });
        }

        const playlist = await Playlist.findById(id);
        if (!playlist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        if (playlist.userId !== req.auth.userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(imageFile.tempFilePath);
        playlist.imageUrl = uploadResponse.secure_url;
        await playlist.save();

        res.json(playlist);

    } catch (error) {
        console.error("Error updating playlist image:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete a playlist
export const deletePlaylist = async (req, res) => {
    try {
        const { id } = req.params;
        const playlist = await Playlist.findById(id);

        if (!playlist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        if (playlist.userId !== req.auth.userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Delete all associated PlaylistSong entries
        await PlaylistSong.deleteMany({ playlistId: id });

        // Delete the playlist itself
        await Playlist.findByIdAndDelete(id);

        res.json({ message: "Playlist deleted successfully" });
    } catch (error) {
        console.error("Error deleting playlist:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Share a playlist to groups or individuals
export const sharePlaylist = async (req, res) => {
    console.log("sharePlaylist called");
    try {
        const { id } = req.params;
        const { type, recipientIds } = req.body; // type: 'groups' or 'individuals'
        const { userId } = getAuth(req);

        console.log(`Sharing playlist ${id} to ${type} with recipients:`, recipientIds);

        const playlist = await Playlist.findById(id);
        if (!playlist) {
            console.error("Playlist not found");
            return res.status(404).json({ message: "Playlist not found" });
        }

        // Get song count
        const songCount = await PlaylistSong.countDocuments({ playlistId: id });

        // Create attachment object with playlist data
        const attachment = {
            type: 'playlist',
            id: id,
            title: playlist.title,
            artist: `${songCount} song${songCount !== 1 ? 's' : ''}`,
            image: playlist.imageUrl || '/default-playlist.png'
        };

        const message = `🎵 Shared a playlist`;

        // Get socket.io instance and online users
        const io = req.app.get('io');
        const onlineUsers = req.app.get('onlineUsers');

        if (type === 'groups') {
            console.log("Processing group share");
            // Share to groups - use GroupMessage model
            const { GroupMessage } = await import("../models/groupMessage.model.js");
            const { Group } = await import("../models/group.model.js");
            const { User } = await import("../models/user.model.js");
            const senderUser = await User.findOne({ clerkId: userId });

            if (!senderUser) console.error("Sender user not found");

            for (const groupId of recipientIds) {
                console.log(`Creating GroupMessage for group ${groupId}`);
                const groupMessage = await GroupMessage.create({
                    groupId,
                    senderId: userId,
                    senderName: senderUser?.fullName || 'User',
                    senderAvatar: senderUser?.imageUrl,
                    content: message,
                    attachment
                });
                console.log("GroupMessage created:", groupMessage._id);

                // Emit socket event to all online members of the group
                const group = await Group.findById(groupId);
                if (group) {
                    for (const memberId of group.members) {
                        const member = await User.findById(memberId);
                        if (member && member.clerkId !== userId) {
                            const memberSocketId = onlineUsers.get(member.clerkId);
                            if (memberSocketId) {
                                io.to(memberSocketId).emit('newGroupMessage', {
                                    ...groupMessage.toObject(),
                                    groupId: group._id
                                });
                                console.log(`Emitted newGroupMessage to ${member.clerkId}`);
                            }
                        }
                    }
                } else {
                    console.error(`Group ${groupId} not found`);
                }
            }
        } else if (type === 'individuals') {
            console.log("Processing individual share");
            // Share to individuals (DMs)
            const { User } = await import("../models/user.model.js");
            const senderUser = await User.findOne({ clerkId: userId });

            for (const receiverId of recipientIds) {
                console.log(`Processing receiver ${receiverId}`);
                // recipientIds contains MongoDB _ids, but Message model expects Clerk IDs for receiverId
                const receiverUser = await User.findById(receiverId);

                if (!receiverUser) {
                    console.error(`Receiver user ${receiverId} not found`);
                    continue;
                }

                console.log(`Creating Message for receiver ${receiverUser.clerkId} (DB ID: ${receiverId})`);
                const dmMessage = await Message.create({
                    senderId: userId,
                    receiverId: receiverUser.clerkId, // Use Clerk ID!
                    content: message,
                    attachment
                });
                console.log("Message created:", dmMessage._id);

                // Emit socket event to recipient if online
                const recipientSocketId = onlineUsers.get(receiverUser.clerkId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('newMessage', {
                        ...dmMessage.toObject(),
                        senderInfo: senderUser
                    });
                    console.log(`Emitted newMessage to ${receiverUser.clerkId}`);
                }
            }
        } else {
            return res.status(400).json({ message: "Invalid share type" });
        }

        res.json({ message: "Playlist shared successfully" });
    } catch (error) {
        console.error("Error sharing playlist:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
