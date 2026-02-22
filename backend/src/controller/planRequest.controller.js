import { PlanRequest } from "../models/planRequest.model.js";
import { User } from "../models/user.model.js";

export const createPlanRequest = async (req, res) => {
    try {
        const { requestedPlan, explanation } = req.body;
        const userId = req.auth.userId;

        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user already has a pending request
        const existingRequest = await PlanRequest.findOne({
            userId: user._id,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: "You already have a pending request." });
        }

        const newRequest = new PlanRequest({
            userId: user._id,
            requestedPlan,
            explanation
        });

        await newRequest.save();

        res.status(201).json(newRequest);
    } catch (error) {
        console.error("Error creating plan request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getUserPlanRequests = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const requests = await PlanRequest.find({ userId: user._id }).sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error("Error fetching user requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Admin: Get all requests
export const getPlanRequests = async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 20 } = req.query;

        const filter = {};
        if (status !== 'all') {
            filter.status = status;
        }

        const requests = await PlanRequest.find(filter)
            .populate('userId', 'fullName imageUrl uniqueId')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await PlanRequest.countDocuments(filter);

        res.json({
            requests,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('Error fetching plan requests:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Admin: Update request status
export const updatePlanRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes, durationMonths } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
        }

        const planRequest = await PlanRequest.findByIdAndUpdate(
            id,
            {
                status,
                adminNote: adminNotes || '',
            },
            { new: true }
        ).populate('userId', 'fullName plan');

        if (!planRequest) {
            return res.status(404).json({ message: "Plan request not found" });
        }

        // If approved, update user's plan with expiry
        if (status === 'approved') {
            const updateData = {
                plan: planRequest.requestedPlan,
            };

            // Calculate expiry date (1, 2, or 3 months)
            const months = [1, 2, 3].includes(durationMonths) ? durationMonths : 1;
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + months);
            updateData.planExpiresAt = expiresAt;

            await User.findByIdAndUpdate(planRequest.userId._id, updateData);
        }

        res.json({ planRequest, message: `Plan request ${status} successfully` });
    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
