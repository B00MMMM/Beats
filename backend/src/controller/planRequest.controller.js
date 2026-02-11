import { PlanRequest } from "../models/planRequest.model.js";
import { User } from "../models/user.model.js";

// Create a new plan request
export const createPlanRequest = async (req, res) => {
    try {
        const { requestedPlan, explanation } = req.body;
        const userId = req.auth.userId; // Clerk user ID

        // Find the user in database
        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user already has this plan
        if (user.plan === requestedPlan) {
            return res.status(400).json({ message: "You already have this plan" });
        }

        // Check if there's a pending request for this user
        const pendingRequest = await PlanRequest.findOne({
            userId: user._id,
            status: 'pending'
        });

        if (pendingRequest) {
            return res.status(400).json({
                message: "You already have a pending plan request. Please wait for approval."
            });
        }

        // Create new plan request
        const planRequest = await PlanRequest.create({
            userId: user._id,
            requestedPlan,
            explanation,
        });

        await planRequest.populate('userId', 'fullName imageUrl clerkId');

        res.status(201).json(planRequest);
    } catch (error) {
        console.error('Error creating plan request:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get current user's plan requests
export const getUserPlanRequests = async (req, res) => {
    try {
        const userId = req.auth.userId;

        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const requests = await PlanRequest.find({ userId: user._id })
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error('Error fetching plan requests:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all pending requests (Admin only - to be implemented later)
export const getPendingRequests = async (req, res) => {
    try {
        const requests = await PlanRequest.find({ status: 'pending' })
            .populate('userId', 'fullName imageUrl clerkId uniqueId')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update request status (Admin only - to be implemented later)
export const updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = req.body;

        const planRequest = await PlanRequest.findById(id).populate('userId');
        if (!planRequest) {
            return res.status(404).json({ message: "Plan request not found" });
        }

        planRequest.status = status;
        if (adminNote) {
            planRequest.adminNote = adminNote;
        }

        // If approved, update user's plan
        if (status === 'approved') {
            await User.findByIdAndUpdate(planRequest.userId._id, {
                plan: planRequest.requestedPlan
            });
        }

        await planRequest.save();
        await planRequest.populate('userId', 'fullName imageUrl clerkId');

        res.json(planRequest);
    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
