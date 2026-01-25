import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: "",
        },
        imageUrl: {
            type: String,
            default: "", // Can be empty, frontend will show placeholder
        },
        userId: {
            type: String, // Clerk User ID
            required: true,
        },
    },
    { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
