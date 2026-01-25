import mongoose from "mongoose";

const playlistSongSchema = new mongoose.Schema(
    {
        playlistId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Playlist",
            required: true,
        },
        songId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Song",
            required: true,
        },
    },
    { timestamps: true }
);

// Indexes for efficient querying
playlistSongSchema.index({ playlistId: 1 });
playlistSongSchema.index({ playlistId: 1, songId: 1 }, { unique: true }); // Prevent duplicate songs in playlist

export const PlaylistSong = mongoose.model("PlaylistSong", playlistSongSchema);
