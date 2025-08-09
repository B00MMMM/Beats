import { User } from "../models/user.model.js";

export const getAllUsers = async (req, res, next) => {
    try{
        const currentUser = req.auth.UserId;
        const users = await User.find({ clerkId: { $ne: currentUser } });
        res.status(200).json(users);
    }catch(error){
        console.error("Error fetching users:", error);
        next(error);
    }
};