import mongoose from "mongoose";

const songRequestSchema = new mongoose.Schema(
    {
        // Deezer song ID to prevent duplicates and fetch metadata
        deezerId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        title: {
            type: String,
            required: true,
        },
        artist: {
            type: String,
            required: true,
        },
        album: {
            type: String,
        },
        duration: {
            type: Number,
        },
        imageUrl: {
            type: String,
        },
        // Tracking how many times people have tried to play this preview-only song
        playCount: {
            type: Number,
            default: 1
        },
        lastPlayed: {
            type: Date,
            default: Date.now
        },
        // Status fields
        isPreviewOnly: {
            type: Boolean,
            default: true
        },
        isChecked: {
            type: Boolean,
            default: false
        },
        // Admin management fields
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium'
        },
        adminNotes: {
            type: String,
            default: ''
        },
        checkedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        checkedAt: {
            type: Date
        }
    },
    { timestamps: true }
);

export const SongRequest = mongoose.model("SongRequest", songRequestSchema);
