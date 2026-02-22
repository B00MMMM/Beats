import mongoose from "mongoose";

const planRequestSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        requestedPlan: {
            type: String,
            enum: ['iron', 'gold', 'diamond'],
            required: true,
        },
        explanation: {
            type: String,
            required: true,
            minlength: 20,
            maxlength: 500,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        adminNote: {
            type: String,
        },
    },
    { timestamps: true }
);

export const PlanRequest = mongoose.model("PlanRequest", planRequestSchema);
