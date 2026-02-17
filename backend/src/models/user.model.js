import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        clerkId: {
            type: String,
            required: true,
            unique: true,
        },
        uniqueId: {
            type: String,
            unique: true,
            sparse: true  // Allows multiple null values if uniqueId is optional
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        isAdmin: {
            type: Boolean,
            default: false
        },
        isActivityShared: {
            type: Boolean,
            default: false // Default to false for privacy
        },
        currentActivity: {
            songId: { type: String, default: null }, // Deezer ID needed for streaming
            title: { type: String, default: null },
            artist: { type: String, default: null },
            album: { type: String, default: null },
            cover: { type: String, default: null },
            duration: { type: Number, default: null },
            timestamp: { type: Date, default: null } // When the activity started
        },
        friends: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        friendRequests: [{
            from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
            createdAt: { type: Date, default: Date.now }
        }],
        plan: {
            type: String,
            enum: ['free', 'iron', 'gold', 'diamond', 'test'],
            default: 'free'
        },
        planExpiresAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
