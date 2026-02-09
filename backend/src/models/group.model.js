import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        imageUrl: {
            type: String,
            default: "",
        },
        creatorId: {
            type: String, // Clerk User ID
            required: true,
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
    },
    { timestamps: true }
);

export const Group = mongoose.model("Group", groupSchema);
