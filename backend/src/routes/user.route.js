import { Router } from "express";
import { getAllUsers, addListeningHistory, toggleLike, getFavorites, getListeningHistory } from "../controller/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getUserUsageStats } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.get("/", protectRoute, getAllUsers);
router.post("/history", protectRoute, addListeningHistory);
router.get("/history", protectRoute, getListeningHistory);
router.post("/like", protectRoute, toggleLike);
router.get("/favorites", protectRoute, getFavorites);

// Rate limit usage stats
router.get("/usage", protectRoute, getUserUsageStats);

// Activity Routes
import { updateActivity, toggleActivitySharing, getFriendsActivity } from "../controller/user.controller.js";
router.post("/activity", protectRoute, updateActivity);
router.post("/activity/toggle", protectRoute, toggleActivitySharing);
router.get("/activity/friends", protectRoute, getFriendsActivity);

export default router;