import { User } from "../models/user.model.js";
import { getAuth } from "@clerk/express";

export const authCallback = async (req, res, next) => {
    try {
        const { id, firstName, lastName, imageUrl } = req.body;

        //check if the user already exists in the database
        let user = await User.findOne({ clerkId: id });

        if (!user) {
            // Generate a unique ID (e.g., #1LG24)
            const uniqueId = '#' + Math.random().toString(36).substring(2, 7).toUpperCase();

            //signup the user
            user = await User.create({
                clerkId: id,
                fullName: `${firstName} ${lastName}`,
                imageUrl,
                uniqueId
            });
        } else if (!user.uniqueId) {
            // Generate uniqueId for existing user if missing
            user.uniqueId = '#' + Math.random().toString(36).substring(2, 7).toUpperCase();
            await user.save();
        }

        res.status(200).json({ success: true, message: "User authenticated successfully" });
    } catch (error) {
        console.log("Error in callback route:", error);
        // Handle error appropriately
        next(error);
    }
}

export const getMe = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getMe route:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}