import mongoose from 'mongoose';

const groupMessageSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    senderId: { type: String, required: true }, // Clerk user ID
    senderName: { type: String, required: true },
    senderAvatar: { type: String },
    content: { type: String },
    attachment: {
        type: { type: String, enum: ['song', 'playlist', 'album'] },
        id: { type: String },
        title: { type: String },
        artist: { type: String },
        image: { type: String },
        audioUrl: { type: String }
    }
}, { timestamps: true });

export const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);
