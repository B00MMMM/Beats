import mongoose from "mongoose";

const listeningHistorySchema = new mongoose.Schema(
    {
        userId: {
            type: String, // Clerk User ID
            required: true,
        },
        deezerId: {
            type: String,
            required: true,
        },
        title: { type: String, required: true },
        artist: { type: String, required: true },
        cover: { type: String },
        duration: { type: Number },
        isLiked: { type: Boolean, default: false },

        listenedAt: {
            type: Date,
            default: Date.now,
        },
        count: { type: Number, default: 1 },
    },
    { timestamps: true }
);

listeningHistorySchema.index({ userId: 1, listenedAt: -1 });
listeningHistorySchema.index({ userId: 1, deezerId: 1 }); // Optimize lookup for upsert

export const ListeningHistory = mongoose.model("ListeningHistory", listeningHistorySchema);
