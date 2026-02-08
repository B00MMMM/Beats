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
            sparse: true,
        },
        isActivityShared: {
            type: Boolean,
            default: true,
        },
        currentActivity: {
            songId: String,
            title: String,
            artist: String,
            cover: String,
            updatedAt: Date,
        },
        friends: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        friendRequests: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
    },
    { timestamps: true, } // Automatically manage createdAt and updatedAt fields
);

export const User = mongoose.model("User", userSchema);