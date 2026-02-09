import { Playlist } from "../models/playlist.model.js";
import { PlaylistSong } from "../models/playlistSong.model.js";
import { Song } from "../models/song.model.js";
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
