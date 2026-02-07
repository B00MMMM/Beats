import { Router } from "express";
import { authCallback, getMe } from "../controller/auth.controller.js";

const router = Router();

router.post("/callback", authCallback);
router.get("/me", getMe);

export default router;