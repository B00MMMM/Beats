import mongoose from "mongoose";

const rateUsageSchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            required: true,
            index: true,
        },
        date: {
            type: String, // YYYY-MM-DD
            required: true,
        },
        searches: {
            type: Number,
            default: 0,
        },
        previews: {
            type: Number,
            default: 0,
        },
        streams: {
            type: Number,
            default: 0,
        },
        aiMessages: {
            type: Number,
            default: 0,
        },
        lastSearchAt: {
            type: Date,
            default: null,
        },
        lastStreamAt: {
            type: Date,
            default: null,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

// Compound index for efficient lookups
rateUsageSchema.index({ clerkId: 1, date: 1 }, { unique: true });

// TTL index: auto-delete records 7 days after expiry
rateUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateUsage = mongoose.model("RateUsage", rateUsageSchema);
