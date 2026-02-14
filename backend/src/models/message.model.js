import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    chatPartnerId: { type: String }, // For AI messages: who the user was chatting with
    senderName: { type: String }, // For display names
    senderAvatar: { type: String }, // For avatars
    content: { type: String },
    // AI song recommendations (for MIZU AI responses)
    songRecommendations: [{
        title: { type: String },
        artist: { type: String },
        deezerId: { type: String },
        cover: { type: String },
        preview: { type: String }
    }],
    isAI: { type: Boolean, default: false }, // Flag for AI messages
    attachment: {
        type: { type: String, enum: ['song', 'playlist', 'album'] },
        id: { type: String }, // External ID (Deezer ID) or Internal ID
        title: { type: String },
        artist: { type: String },
        image: { type: String },
        audioUrl: { type: String } // Optional preview URL
    }
}, { timestamps: true });

export const Message = mongoose.model("Message", messageSchema);