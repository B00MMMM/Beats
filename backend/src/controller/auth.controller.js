import { User } from "../models/user.model.js";

export const authCallback =  async (req,res,next) => {
    try {
        const { id, firstName, lastName, imageUrl } = req.body;

        //check if the user already exists in the database
        const user = await User.findOne({ clerkId: id });

        if(!user){
            //signup the user
            await User.create({
                clerkId: id,
                fullName: `${firstName} ${lastName}`,
                imageUrl,
            });
        }

        res.status(200).json({ success : true, message: "User authenticated successfully" });
    } catch (error) {
        console.log("Error in callback route:", error);
        // Handle error appropriately
        next(error);
    }
}