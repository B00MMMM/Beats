import mongoose from 'mongoose';

const groupMessageSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    senderId: { type: String, required: false }, // Clerk user ID (optional for system messages)
    senderName: { type: String, required: false }, // Optional for system messages
    senderAvatar: { type: String },
    isSystemMessage: { type: Boolean, default: false },
    isAI: { type: Boolean, default: false }, // Flag for AI messages
    // AI song recommendations (for MIZU AI responses)
    songRecommendations: [{
        title: { type: String },
        artist: { type: String },
        deezerId: { type: String },
        cover: { type: String },
        preview: { type: String }
    }],
    systemMessageType: {
        type: String,
        enum: ['member_added', 'member_removed', 'member_left', 'admin_promoted', 'admin_demoted', 'group_name_changed', 'group_image_changed'],
        required: false
    },
    systemMessageData: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
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
