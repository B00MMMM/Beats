import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
    {
        deezerId: {
            type: String,
            required: true,
            unique: true,
        },
        title: {
            type: String,
            required: true,
        },
        artist: {
            type: Object, // Store full artist object from Deezer
            required: true,
        },
        album: {
            type: Object, // Store full album object from Deezer
            required: false,
        },
        cover: {
            type: String,
        },
        duration: {
            type: Number,
        },
        preview: {
            type: String,
        },
        explicit_lyrics: {
            type: Boolean,
        },
        rank: {
            type: Number,
        },
    },
    { timestamps: true }
);

export const Song = mongoose.model("Song", songSchema);
