import mongoose from 'mongoose';

const aiChatMessageSchema = new mongoose.Schema({
    role: { 
        type: String, 
        enum: ['user', 'assistant'], 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    recommendations: [{
        title: { type: String },
        artist: { type: String },
        deezerId: { type: String },
        cover: { type: String },
        preview: { type: String }
    }]
}, { timestamps: true });

const aiChatConversationSchema = new mongoose.Schema({
    userId: { 
        type: String, 
        required: true,
        index: true
    },
    messages: [aiChatMessageSchema],
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Update lastActivity before saving
aiChatConversationSchema.pre('save', function() {
    this.lastActivity = new Date();
});

export const AIChatConversation = mongoose.model("AIChatConversation", aiChatConversationSchema);