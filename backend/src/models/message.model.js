import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    content: { type: String },
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