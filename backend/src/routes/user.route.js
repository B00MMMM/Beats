import { Router } from "express";
import { getAllUsers, addListeningHistory, toggleLike, getFavorites } from "../controller/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protectRoute, getAllUsers);
router.post("/history", protectRoute, addListeningHistory);
router.post("/like", protectRoute, toggleLike);
router.get("/favorites", protectRoute, getFavorites);

export default router;