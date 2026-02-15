import { Router } from "express";
import { getTrendingSongs, searchSongs, streamSong, getSongDetails } from "../controller/song.controller.js";

const router = Router();

router.get("/trending", getTrendingSongs);
router.get("/search", searchSongs);
router.get("/stream/:deezerId", streamSong);
router.get("/track/:deezerId", getSongDetails);
router.get("/:deezerId", getSongDetails);

export default router;