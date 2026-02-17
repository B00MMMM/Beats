import { Router } from "express";
import { getTrendingSongs, searchSongs, streamSong, getSongDetails } from "../controller/song.controller.js";
import { rateLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

// Rate-limited routes (auth is optional inside rateLimiter — if user is logged in, limits apply)
router.get("/trending", rateLimiter('search'), getTrendingSongs);
router.get("/search", rateLimiter('search'), searchSongs);
router.get("/stream/:deezerId", streamSong);

// Public routes — no rate limiting needed (lightweight DB/API lookups)
router.get("/track/:deezerId", getSongDetails);
router.get("/:deezerId", getSongDetails);

export default router;