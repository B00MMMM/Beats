import { getAuth } from "@clerk/express";

export const protectRoute = async (req, res, next) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized - you must be logged in" });
        }

        next();
    } catch (error) {
        console.log("Error in auth middleware", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const requireAdminRole = async (req, res, next) => {
    try {
        const { userId } = getAuth(req);

        // Dynamic import to avoid circular dependencies if any
        const { User } = await import("../models/user.model.js");

        const user = await User.findOne({ clerkId: userId });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Admin access required" });
        }

        req.adminUser = user;
        next();
    } catch (error) {
        console.error("Admin Auth Error:", error);
        res.status(500).json({ message: "Authorization error" });
    }
};
